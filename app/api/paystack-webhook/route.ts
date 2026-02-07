import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // ✅ Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid Paystack signature");
      return new NextResponse("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);
    const { event: eventType, data } = event;

    console.log(`📬 Paystack Webhook Event: ${eventType}`);

    // Only handle successful charge events
    if (eventType !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    // Extract relevant metadata
    const metadata = data?.metadata || {};
    const userId = metadata.userId;

    if (!userId) {
      console.error("⚠️ Missing userId in metadata");
      return new NextResponse("Invalid metadata", { status: 400 });
    }

    // ----------------------------
    // 1️⃣ Handle credit purchase
    // ----------------------------
    if (metadata.type === "credits") {
      const creditsToAdd = metadata.credits || 0;

      if (creditsToAdd <= 0) {
        console.error("⚠️ Invalid credits amount in metadata");
        return new NextResponse("Invalid credits metadata", { status: 400 });
      }

      // Upsert the user's credits balance
      const { error } = await supabaseServer
        .from("credits_balance")
        .upsert({
          id: userId,
          balance: supabaseServer.raw(`COALESCE(balance, 0) + ${creditsToAdd}`),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("❌ Failed to update credits:", error.message);
        return new NextResponse("Failed to update credits", { status: 500 });
      }

      console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
      return NextResponse.json({ received: true });
    }

    // ----------------------------
    // 2️⃣ Handle subscriptions (existing logic)
    // ----------------------------
    const planId = metadata.planId;
    if (!planId) {
      console.error("⚠️ Missing planId in metadata for subscription purchase");
      return new NextResponse("Invalid metadata", { status: 400 });
    }

    // Confirm the payment on Paystack (optional)
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${data.reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );
    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data.status !== "success") {
      console.error("⚠️ Payment verification failed:", verifyData.message);
      return new NextResponse("Payment verification failed", { status: 400 });
    }

    // Fetch plan details
    const { data: plan, error: planError } = await supabaseServer
      .from("plans")
      .select("id, name")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      console.error("❌ Plan not found in database:", planError?.message);
      return new NextResponse("Plan not found", { status: 404 });
    }

    // Create or update subscription
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
      console.error("❌ Failed to upsert subscription:", subError.message);
      return new NextResponse("Failed to update subscription", { status: 500 });
    }

    // Update user role
    const newRole =
      plan.name.toLowerCase() === "pro"
        ? "pro"
        : plan.name.toLowerCase() === "standard"
        ? "standard"
        : "free";

    const { error: userError } = await supabaseServer
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);

    if (userError) {
      console.error("⚠️ Failed to update user role:", userError.message);
    }

    console.log(`✅ User ${userId} upgraded to ${plan.name} plan`);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Webhook handler error:", err.message);
    return new NextResponse("Server error", { status: 500 });
  }
}
