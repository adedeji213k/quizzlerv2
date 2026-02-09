// app/api/paystack/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // 1️⃣ Verify Paystack signature
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

    if (eventType !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const reference = data.reference;
    const metadata = data?.metadata || {};
    const userId = metadata.userId;

    if (!reference || !userId) {
      console.error("⚠️ Missing reference or userId");
      return new NextResponse("Invalid metadata", { status: 400 });
    }

    // 2️⃣ Idempotency check
    const { data: existingEvent } = await supabaseServer
      .from("payment_events")
      .select("reference")
      .eq("reference", reference)
      .single();

    if (existingEvent) {
      console.log("🔁 Webhook already processed:", reference);
      return NextResponse.json({ received: true });
    }

    // ----------------------------
    // 3️⃣ Handle CREDIT purchase
    // ----------------------------
    if (metadata.type === "credits") {
      const creditsToAdd = Number(metadata.credits);

      if (!creditsToAdd || creditsToAdd <= 0) {
        console.error("⚠️ Invalid credits metadata");
        return new NextResponse("Invalid credits metadata", { status: 400 });
      }

      // Fetch current balance
      const { data: balanceRow } = await supabaseServer
        .from("credits_balance")
        .select("balance")
        .eq("id", userId)
        .single();

      const currentBalance = balanceRow?.balance ?? 0;

      // Update balance
      const { error: balanceError } = await supabaseServer
        .from("credits_balance")
        .upsert({
          id: userId,
          balance: currentBalance + creditsToAdd,
          updated_at: new Date().toISOString(),
        });

      if (balanceError) {
        console.error("❌ Failed to update credits:", balanceError.message);
        return new NextResponse("Failed to update credits", { status: 500 });
      }

      // Record payment event
      await supabaseServer.from("payment_events").insert({
        reference,
        type: "credits",
        processed_at: new Date().toISOString(),
      });

      console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
      return NextResponse.json({ received: true });
    }

    // ----------------------------
    // 4️⃣ Handle SUBSCRIPTION purchase
    // ----------------------------
    const planId = metadata.planId;
    if (!planId) {
      console.error("⚠️ Missing planId in subscription metadata");
      return new NextResponse("Invalid metadata", { status: 400 });
    }

    const { data: plan, error: planError } = await supabaseServer
      .from("plans")
      .select("id, name")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      console.error("❌ Plan not found");
      return new NextResponse("Plan not found", { status: 404 });
    }

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    await supabaseServer.from("subscriptions").upsert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      current_period_end: currentPeriodEnd.toISOString(),
      created_at: new Date().toISOString(),
    });

    const role =
      plan.name.toLowerCase() === "pro"
        ? "pro"
        : plan.name.toLowerCase() === "standard"
        ? "standard"
        : "free";

    await supabaseServer.from("users").update({ role }).eq("id", userId);

    await supabaseServer.from("payment_events").insert({
      reference,
      type: "subscription",
      processed_at: new Date().toISOString(),
    });

    console.log(`✅ User ${userId} subscribed to ${plan.name}`);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Webhook error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
