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
    console.error("❌ Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle only checkout completed events
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const customerEmail = session.customer_email;

  if (!customerEmail) {
    console.error("⚠️ No customer email in session:", session.id);
    return new NextResponse("Missing customer email", { status: 400 });
  }

  // 1️⃣ Ensure the user exists in your `users` table
  let { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", customerEmail)
    .single();

  if (userError && userError.code !== "PGRST116") {
    console.error("⚠️ Error querying users table:", userError.message);
    return new NextResponse("Database error", { status: 500 });
  }

  if (!user) {
    console.log("ℹ️ User not found in users table. Creating new record...");

    // ✅ Supabase v2 admin API fix
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      email: customerEmail,
    });

    if (listError) {
      console.error("⚠️ Error fetching auth users:", listError.message);
      return new NextResponse("Auth error", { status: 500 });
    }

    const authUser = usersData?.users?.[0];
    if (!authUser) {
      console.error("⚠️ User not found in auth.users:", customerEmail);
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
      console.error("❌ Failed to insert user:", insertError.message);
      return new NextResponse("Failed to create user", { status: 500 });
    }

    user = newUser;
  }

  // 2️⃣ Retrieve subscription details from Stripe
  const subscription = (await stripe.subscriptions.retrieve(
    session.subscription as string
  )) as Stripe.Subscription;

  if (!subscription) {
    console.error("⚠️ Subscription not found for session:", session.id);
    return new NextResponse("Subscription not found", { status: 404 });
  }

  // 3️⃣ Extract price ID
  const subscriptionItem = subscription.items.data[0];
  if (!subscriptionItem || !subscriptionItem.price?.id) {
    console.error("⚠️ Subscription has no items or price ID:", subscription.id);
    return new NextResponse("Invalid subscription items", { status: 400 });
  }

  const priceId = subscriptionItem.price.id;

  // 4️⃣ Fetch plan from your `plans` table
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name")
    .eq("stripe_price_id", priceId)
    .single();

  if (planError) {
    console.error("⚠️ Could not find plan for price:", priceId, planError.message);
  }

  // 🧹 5️⃣ Cancel old active subscriptions for this user (both on Stripe and locally)
  const { data: oldSubs, error: oldSubError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .neq("stripe_subscription_id", subscription.id)
    .eq("status", "active");

  if (oldSubError) {
    console.error("⚠️ Error fetching old subscriptions:", oldSubError.message);
  } else if (oldSubs && oldSubs.length > 0) {
    for (const old of oldSubs) {
      try {
        await stripe.subscriptions.cancel(old.stripe_subscription_id);
        console.log(`🗑️ Canceled old Stripe subscription: ${old.stripe_subscription_id}`);
      } catch (cancelErr: any) {
        console.error("⚠️ Stripe cancel failed:", cancelErr.message);
      }
    }

    const { error: deactivateError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", user.id)
      .neq("stripe_subscription_id", subscription.id);

    if (deactivateError) {
      console.error("⚠️ Failed to deactivate old subscriptions:", deactivateError.message);
    }
  }

  // 6️⃣ Always set current_period_end to one month from now
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  // 7️⃣ Upsert subscription record in Supabase
  const { error: upsertError } = await supabase.from("subscriptions").upsert({
    user_id: user.id,
    plan_id: plan?.id ?? null,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: currentPeriodEnd.toISOString(),
    created_at: new Date().toISOString(),
  });

  if (upsertError) {
    console.error("❌ Failed to upsert subscription:", upsertError.message);
    return new NextResponse("Failed to upsert subscription", { status: 500 });
  }

  // 8️⃣ Update user role based on plan
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
      console.error("❌ Failed to update user role:", roleError.message);
      return new NextResponse("Failed to update role", { status: 500 });
    }
  }

  console.log(
    `✅ Subscription processed for ${customerEmail} (plan: ${
      plan?.name ?? "unknown"
    }, ends: ${currentPeriodEnd.toISOString()})`
  );

  return NextResponse.json({ received: true });
}
