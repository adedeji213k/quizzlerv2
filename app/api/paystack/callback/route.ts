import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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

    if (!userId) {
      console.error("⚠️ Missing userId in payment metadata");
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=failed`);
    }

    // ----------------------------
    // 2️⃣ Handle credit bundle purchase
    // ----------------------------
    if (metadata.type === "credits") {
      const creditsToAdd = metadata.credits || 0;

      if (creditsToAdd <= 0) {
        console.error("⚠️ Invalid credits amount in metadata");
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=failed`);
      }

      // Upsert user's credits balance
      const { error } = await supabaseServer
        .from("credits_balance")
        .upsert({
          id: userId,
          balance: supabaseServer.raw(`COALESCE(balance, 0) + ${creditsToAdd}`),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("❌ Failed to update credits:", error.message);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=error`);
      }

      console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=success&credits=${creditsToAdd}`);
    }

    // ----------------------------
    // 3️⃣ Handle subscription purchase (existing logic)
    // ----------------------------
    const planId = metadata.planId;
    if (!planId) {
      console.error("⚠️ Missing planId in metadata for subscription purchase");
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=failed`);
    }

    // Fetch plan from Supabase
    const { data: plan, error: planError } = await supabaseServer
      .from("plans")
      .select("id, name")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      console.error("⚠️ Plan not found in Supabase:", planError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=failed`);
    }

    // Update user role
    const role = plan.name.toLowerCase();
    const { error: roleError } = await supabaseServer
      .from("users")
      .update({ role })
      .eq("id", userId);

    if (roleError) {
      console.error("⚠️ Failed to update user role:", roleError);
    }

    // Add or update subscription
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const { error: subError } = await supabaseServer.from("subscriptions").upsert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      current_period_end: currentPeriodEnd.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (subError) {
      console.error("⚠️ Failed to upsert subscription:", subError.message);
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=success`);
  } catch (err: any) {
    console.error("❌ Error verifying Paystack payment:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?status=error`);
  }
}
