import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Initialize Stripe + Supabase
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Runtime + region (for Vercel)
export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(req: Request) {
  const body = await req.text();

  // ✅ Await headers in Next.js 16+
  const hdrs = await headers();
  const sig = hdrs.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    // ✅ Handle subscription events
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      // 👇 Fix: extend the type to include missing fields
      const subscription = event.data.object as Stripe.Subscription & {
        current_period_end?: number;
      };

      const customerId = subscription.customer as string;
      const stripeSubscriptionId = subscription.id;
      const status = subscription.status;

      // 👇 Safe access to possibly missing field
      const current_period_end = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

      const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

      // ✅ Find user by Stripe customer ID
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (userData) {
        const { error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userData.id,
              plan_id: priceId,
              stripe_customer_id: customerId,
              stripe_subscription_id: stripeSubscriptionId,
              status,
              current_period_end,
            },
            { onConflict: "stripe_subscription_id" }
          );

        if (upsertError) {
          console.error("❌ Supabase upsert error:", upsertError.message);
        } else {
          console.log("✅ Subscription saved:", stripeSubscriptionId);
        }
      }
    }

    // ✅ Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);
    }

    return new NextResponse("Webhook handled", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook handling error:", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
