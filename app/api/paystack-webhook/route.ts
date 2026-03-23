// app/api/paystack/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

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
    const amountPaid = data.amount / 100; // Paystack sends kobo

    if (!reference || !userId) {
      console.error("⚠️ Missing reference or userId");
      return new NextResponse("Invalid metadata", { status: 400 });
    }

    // 2️⃣ Idempotency
    const { data: existingEvent } = await supabaseServer
      .from("payment_events")
      .select("reference")
      .eq("reference", reference)
      .single();

    if (existingEvent) {
      console.log("🔁 Webhook already processed:", reference);
      return NextResponse.json({ received: true });
    }

    // 🔥 Create transaction record (used for commissions)
    const { data: transaction, error: txError } = await supabaseServer
      .from("transactions")
      .insert({
        user_id: userId,
        amount: amountPaid,
        type: metadata.type,
        status: "paid",
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error("❌ Failed to create transaction");
      return new NextResponse("Transaction error", { status: 500 });
    }

    // ----------------------------
    // 3️⃣ Handle CREDIT purchase
    // ----------------------------
    if (metadata.type === "credits") {
      const creditsToAdd = Number(metadata.credits);

      if (!creditsToAdd || creditsToAdd <= 0) {
        return new NextResponse("Invalid credits metadata", { status: 400 });
      }

      const { data: balanceRow } = await supabaseServer
        .from("credits_balance")
        .select("balance")
        .eq("id", userId)
        .single();

      const currentBalance = balanceRow?.balance ?? 0;

      await supabaseServer.from("credits_balance").upsert({
        id: userId,
        balance: currentBalance + creditsToAdd,
        updated_at: new Date().toISOString(),
      });

      // 🔥 HANDLE COMMISSION (10%)
      await handleCommission(userId, amountPaid, "credits", transaction.id);

      await supabaseServer.from("payment_events").insert({
        reference,
        type: "credits",
        processed_at: new Date().toISOString(),
      });

      return NextResponse.json({ received: true });
    }

    // ----------------------------
    // 4️⃣ Handle SUBSCRIPTION
    // ----------------------------
    const planId = metadata.planId;

    const { data: plan } = await supabaseServer
      .from("plans")
      .select("id, name")
      .eq("id", planId)
      .single();

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

    // 🔥 HANDLE COMMISSION (30%)
    await handleCommission(userId, amountPaid, "subscription", transaction.id);

    await supabaseServer.from("payment_events").insert({
      reference,
      type: "subscription",
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error("❌ Webhook error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}

// ================================
// 🔥 COMMISSION HANDLER
// ================================
async function handleCommission(
  userId: string,
  amount: number,
  type: "subscription" | "credits",
  transactionId: string
) {
  // 1️⃣ Get referral code from user
  const { data: user } = await supabaseServer
    .from("users")
    .select("referred_by")
    .eq("id", userId)
    .single();

  if (!user?.referred_by) return;

  // 2️⃣ Find ambassador
  const { data: ambassador } = await supabaseServer
    .from("ambassadors")
    .select("id")
    .eq("referral_code", user.referred_by)
    .single();

  if (!ambassador) return;

  // 3️⃣ Calculate commission
  const rate = type === "subscription" ? 0.3 : 0.1;
  const commissionAmount = amount * rate;

  // 4️⃣ Insert commission
  await supabaseServer.from("commissions").insert({
    ambassador_id: ambassador.id,
    user_id: userId,
    transaction_id: transactionId,
    amount_earned: commissionAmount,
    type,
  });

  // 5️⃣ Update ambassador total
  await supabaseServer.rpc("increment_ambassador_earnings", {
    ambassador_id_input: ambassador.id,
    amount_input: commissionAmount,
  });

  console.log(
    `💰 Commission added: ₦${commissionAmount} for ambassador ${ambassador.id}`
  );
}