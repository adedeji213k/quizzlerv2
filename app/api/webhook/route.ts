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

  // 1️⃣ Verify webhook signature
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

  // Only handle completed checkout sessions
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const customerEmail = session.customer_email;

  if (!customerEmail) {
    console.error("No customer email in session:", session.id);
    return new NextResponse("Missing customer email", { status: 400 });
  }

  // 2️⃣ Ensure user exists
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
    // Fetch auth user safely
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error("Error fetching auth users:", authError.message);
      return new NextResponse("Auth error", { status: 500 });
    }

    const authUser = authUsers.users.find(u => u.email === customerEmail);
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

  // 3️⃣ Retrieve Stripe subscription
  if (!session.subscription) {
    console.error("Session has no subscription:", session.id);
    return new NextResponse("No subscription ID in session", { status: 400 });
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const subscriptionItem = subscription.items.data[0];

  if (!subscriptionItem?.price?.id) {
    console.error("Subscription has no price ID:", subscription.id);
    return new NextResponse("Invalid subscription items", { status: 400 });
  }

  // 4️⃣ Map Stripe price ID → plan_id from DB
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

  // 5️⃣ Check for existing subscription for the user
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("stripe_subscription_id", subscription.id)
    .single();

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // 6️⃣ Upsert subscription
  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan_id: planId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_end: periodEnd,
      },
      { onConflict: "stripe_subscription_id" } // ensures updates instead of duplicates
    );

  if (upsertError) {
    console.error("Failed to upsert subscription:", upsertError.message);
    return new NextResponse("Failed to upsert subscription", { status: 500 });
  }

  // 7️⃣ Update user role based on plan
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
