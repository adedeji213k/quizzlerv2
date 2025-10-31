import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
  }

  try {
    // 1️⃣ Verify the transaction with Paystack
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
      console.error("❌ Payment verification failed:", verifyData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=failed`);
    }

    const payment = verifyData.data;
    const metadata = payment.metadata || {};
    const userId = metadata.userId;
    const planId = metadata.planId;

    console.log("✅ Payment verified for:", { userId, planId, payment });

    // 2️⃣ Fetch plan from Supabase
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, name")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      console.error("⚠️ Plan not found in Supabase:", planError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=failed`);
    }

    // 3️⃣ Update user role in Supabase
    const role = plan.name.toLowerCase(); // e.g. 'standard' or 'pro'
    const { error: roleError } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId);

    if (roleError) {
      console.error("⚠️ Failed to update user role:", roleError);
    }

    // 4️⃣ Add or update subscription in Supabase
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const { error: subError } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      current_period_end: currentPeriodEnd.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (subError) {
      console.error("⚠️ Failed to upsert subscription:", subError.message);
    }

    // ✅ Redirect to dashboard with success message
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=success`);
  } catch (err: any) {
    console.error("❌ Error verifying Paystack payment:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=error`);
  }
}
