// app/api/paystack/callback/route.ts
import { NextResponse } from "next/server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(`${BASE_URL}/dashboard?status=failed`);
  }

  try {
    // 1️⃣ Verify transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      console.error("❌ Paystack verification failed:", verifyData);
      return NextResponse.redirect(`${BASE_URL}/dashboard?status=failed`);
    }

    const payment = verifyData.data;
    const metadata = payment.metadata || {};

    // Safety check
    if (!metadata.userId) {
      console.error("⚠️ Missing userId in Paystack metadata");
      return NextResponse.redirect(`${BASE_URL}/dashboard?status=failed`);
    }

    /**
     * IMPORTANT:
     * - No DB writes here
     * - Webhook handles credits & subscriptions
     */

    // ----------------------------
    // 2️⃣ Credits purchase → let webhook handle it
    // ----------------------------
    if (metadata.type === "credits") {
      return NextResponse.redirect(
        `${BASE_URL}/dashboard?status=processing`
      );
    }

    // ----------------------------
    // 3️⃣ Subscription purchase → let webhook handle it
    // ----------------------------
    if (metadata.planId) {
      return NextResponse.redirect(
        `${BASE_URL}/dashboard?status=processing`
      );
    }

    // Fallback (should never happen)
    return NextResponse.redirect(`${BASE_URL}/dashboard?status=success`);
  } catch (err: any) {
    console.error("❌ Paystack callback error:", err);
    return NextResponse.redirect(`${BASE_URL}/dashboard?status=error`);
  }
}
