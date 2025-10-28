import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ✅ Create Supabase client directly here
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // must be service key
  { auth: { persistSession: false } }
);

// ✅ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// ✅ Webhook secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Define minimal shape for subscription
type StripeSubscriptionPayload = {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
  items: {
    data: {
      price: {
        id: string;
      };
    }[];
  };
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // 🧾 Subscription created or updated
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as unknown as StripeSubscriptionPayload;

        const stripeCustomerId = subscription.customer;
        const stripeSubscriptionId = subscription.id;
        const status = subscription.status;
        const current_period_end = new Date(subscription.current_period_end * 1000);

        // Fetch plan ID based on Stripe price ID
        const priceId = subscription.items.data[0].price.id;
        const { data: plan, error: planError } = await supabase
          .from("plans")
          .select("id, name")
          .eq("stripe_price_id", priceId)
          .single();

        if (planError) console.error("⚠️ Plan lookup failed:", planError.message);

        // Get the user linked to this Stripe customer
        const { data: user, error: userError } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .single();

        if (userError || !user) {
          console.error("⚠️ No user found for customer:", stripeCustomerId);
          break;
        }

        // Update subscription record
        const { error: subError } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: user.user_id,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            status,
            plan_id: plan?.id,
            current_period_end,
          });

        if (subError) console.error("⚠️ Subscription upsert failed:", subError.message);

        // Update user role based on plan
        const newRole = plan?.name?.toLowerCase() || "free";
        const { error: roleError } = await supabase
          .from("users")
          .update({ role: newRole })
          .eq("id", user.user_id);

        if (roleError) console.error("⚠️ Role update failed:", roleError.message);

        console.log(`✅ Subscription ${status} for user ${user.user_id}`);
        break;
      }

      // ❌ Subscription canceled
      case "customer.subscription.deleted": {
        const subscription = event.data.object as { customer: string };
        const stripeCustomerId = subscription.customer;

        const { data: user, error: userError } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .single();

        if (userError || !user) {
          console.error("⚠️ No user found for canceled subscription:", stripeCustomerId);
          break;
        }

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("user_id", user.user_id);

        await supabase
          .from("users")
          .update({ role: "free" })
          .eq("id", user.user_id);

        console.log(`🚫 Subscription canceled for user ${user.user_id}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
