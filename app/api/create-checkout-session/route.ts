import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  try {
    const { planId, userId } = await req.json();

    if (!planId || !userId) {
      return NextResponse.json(
        { error: "Missing planId or userId" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch the plan from Supabase
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("stripe_price_id, name")
      .eq("id", planId)
      .single();

    if (planError || !planData?.stripe_price_id) {
      return NextResponse.json(
        { error: "Stripe Price ID not configured for this plan" },
        { status: 400 }
      );
    }

    // 2️⃣ Fetch user email from Supabase
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !userData?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3️⃣ Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userData.email,
      line_items: [
        {
          price: planData.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
