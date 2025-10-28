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

  // 1️⃣ Ensure the user exists in your `users` table
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
    console.log("User not found in users table. Creating new record...");

    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();
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

  // 2️⃣ Retrieve subscription details from Stripe
  const subscription = (await stripe.subscriptions.retrieve(
    session.subscription as string
  )) as Stripe.Subscription;

  if (!subscription) {
    console.error("Subscription not found for session:", session.id);
    return new NextResponse("Subscription not found", { status: 404 });
  }

  // 3️⃣ Extract subscription item safely
  const subscriptionItem = subscription.items.data[0];
  if (!subscriptionItem || !subscriptionItem.price?.id) {
    console.error("Subscription has no items or price ID:", subscription.id);
    return new NextResponse("Invalid subscription items", { status: 400 });
  }

  const priceId = subscriptionItem.price.id;

  // 4️⃣ Fetch corresponding plan from your `plans` table
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name")
    .eq("stripe_price_id", priceId)
    .single();

  if (planError) {
    console.error("⚠️ Could not find plan for price:", priceId, planError.message);
  }

  // 🧹 5️⃣ Cancel/deactivate other active subscriptions for this user
  const { error: deactivateError } = await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("user_id", user.id)
    .neq("stripe_subscription_id", subscription.id);

  if (deactivateError) {
    console.error("Failed to deactivate old subscriptions:", deactivateError.message);
  }

  // 6️⃣ Upsert subscription record with plan_id
  const periodEnd = (subscription as any).current_period_end;
  const { error: upsertError } = await supabase.from("subscriptions").upsert({
    user_id: user.id,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    plan_id: plan?.id ?? null, // ✅ include plan ID if found
  });

  if (upsertError) {
    console.error("Failed to upsert subscription:", upsertError.message);
    return new NextResponse("Failed to upsert subscription", { status: 500 });
  }

  // 7️⃣ Update user role based on plan or default
  const planRoleMap: Record<string, string> = {
    price_standard: "standard",
    price_pro: "pro",
  };

  const role = planRoleMap[priceId] ?? plan?.name?.toLowerCase() ?? "pro";

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

  console.log(
    `✅ Subscription processed successfully for ${customerEmail} (plan: ${
      plan?.name ?? "unknown"
    })`
  );
  return NextResponse.json({ received: true });
}
