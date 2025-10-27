import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const customerEmail = session.customer_email;

  if (!customerEmail) {
    console.error("No customer email in session:", session.id);
    return new NextResponse("Missing customer email", { status: 400 });
  }

  // 1️⃣ Ensure user exists
  let { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", customerEmail)
    .single();

  if (userError && userError.code !== "PGRST116") {
    console.error("Error querying users table:", userError.message);
    return new NextResponse("Database error", { status: 500 });
  }

  if (!user) {
    console.log("User not found. Creating new record...");

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error("Error fetching auth users:", authError.message);
      return new NextResponse("Auth error", { status: 500 });
    }

    const authUser = authUsers.users.find((u) => u.email === customerEmail);
    if (!authUser) {
      console.error("User not found in auth.users:", customerEmail);
      return new NextResponse("Auth user not found", { status: 404 });
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        email: customerEmail,
        name: authUser.user_metadata?.full_name ?? "",
        role: "free",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert user:", insertError.message);
      return new NextResponse("Failed to create user", { status: 500 });
    }

    user = newUser;
  }

  // 2️⃣ Retrieve subscription from Stripe
  const subscription = (await stripe.subscriptions.retrieve(
    session.subscription as string
  )) as Stripe.Subscription;

  if (!subscription) {
    console.error("Subscription not found for session:", session.id);
    return new NextResponse("Subscription not found", { status: 404 });
  }

  // 3️⃣ Get subscription item
  const subscriptionItem = subscription.items.data[0];
  if (!subscriptionItem?.price?.id) {
    console.error("Subscription has no items or price ID:", subscription.id);
    return new NextResponse("Invalid subscription items", { status: 400 });
  }

  // 4️⃣ Map Stripe price ID to plan_id from DB
  const { data: planData, error: planError } = await supabase
    .from("plans")
    .select("id, name")
    .eq("price_id", subscriptionItem.price.id)
    .single();

  if (planError || !planData) {
    console.error("Plan not found for Stripe price ID:", subscriptionItem.price.id);
    return new NextResponse("Plan not found", { status: 404 });
  }

  const planId = planData.id;

  // 5️⃣ Upsert subscription
  const periodEnd = (subscription as any).current_period_end;
  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(
      [
        {
          user_id: user.id,
          plan_id: planId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        },
      ],
      { onConflict: "stripe_subscription_id" } // ✅ must be string
    );

  if (upsertError) {
    console.error("Failed to upsert subscription:", upsertError.message);
    return new NextResponse("Failed to upsert subscription", { status: 500 });
  }

  // 6️⃣ Update user role
  const roleMap: Record<string, string> = {
    Standard: "standard",
    Pro: "pro",
  };

  const role = planData.name ? roleMap[planData.name] ?? "pro" : "pro";

  if (subscription.status === "active") {
    const { error: roleError } = await supabase
      .from("users")
      .update({ role })
      .eq("id", user.id);

    if (roleError) {
      console.error("Failed to update user role:", roleError.message);
      return new NextResponse("Failed to update role", { status: 500 });
    }
  }

  console.log("✅ Subscription processed successfully for:", customerEmail);
  return NextResponse.json({ received: true });
}
