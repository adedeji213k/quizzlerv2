// app/api/paystack/init-credits/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const CREDIT_BUNDLES = [
  { id: "credits_5", price: 20000, credits: 5 },   // ₦200 → 1 quiz
  { id: "credits_15", price: 50000, credits: 15 }, // ₦500 → 3 quizzes
  { id: "credits_35", price: 100000, credits: 35 } // ₦1,000 → 7 quizzes
];

export async function POST(req: Request) {
  try {
    const { userId, bundleId } = await req.json();

    if (!userId || !bundleId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const bundle = CREDIT_BUNDLES.find(b => b.id === bundleId);
    if (!bundle) {
      return NextResponse.json({ error: "Invalid bundle selected" }, { status: 400 });
    }

    // ✅ Create Paystack transaction
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack secret key");

    const body = {
      email: (await supabaseServer.auth.admin.getUserById(userId)).data.user.email,
      amount: bundle.price, // in Kobo
      currency: "NGN",
      metadata: {
        type: "credits",
        credits: bundle.credits,
        userId,
        bundleId,
      },
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/paystack/callback`, // optional redirect
    }; 

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json({ error: data.message || "Failed to initialize Paystack" }, { status: 500 });
    }

    return NextResponse.json({ url: data.data.authorization_url });
  } catch (err: any) {
    console.error("❌ Init credits error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
