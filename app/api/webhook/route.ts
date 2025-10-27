import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe + Supabase
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Use this for Next.js 16+ instead of `export const config`
export const runtime = "nodejs";
export const preferredRegion = "iad1"; // optional: pick a region close to your Stripe endpoint

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

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
    if (event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      // Extract fields safely
      const customerId = subscription.customer as string;
      const subscriptionId = subscription.id;
      const planId = subscription.items.data[0]?.price?.id;
      const status = subscription.status;
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

      // Get the user_id linked to this customer
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
              plan_id: planId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status,
              current_period_end: periodEnd,
            },
            { onConflict: "stripe_subscription_id" } // ✅ must be string not array
          );

        if (upsertError) {
          console.error("❌ Supabase upsert error:", upsertError.message);
        } else {
          console.log("✅ Subscription saved:", subscriptionId);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscriptionId);
    }

    return new NextResponse("Webhook handled", { status: 200 });
  } catch (err) {
    console.error("❌ Webhook handling error:", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
