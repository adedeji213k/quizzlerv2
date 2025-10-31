import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: Request) {
  try {
    const { planId, userId } = await req.json();
    console.log("🟢 Received request with:", { planId, userId });

    if (!planId || !userId) {
      console.error("❌ Missing planId or userId");
      return NextResponse.json(
        { error: "Missing planId or userId" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch the plan from Supabase (include Paystack plan code)
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("id, name, monthly_price, paystack_plan_code")
      .eq("id", planId)
      .single();

    console.log("📦 Plan query result:", { planData, planError });

    if (planError || !planData) {
      console.error("❌ Plan not found in Supabase:", planError?.message);
      return NextResponse.json({ error: "Plan not found" }, { status: 400 });
    }

    if (!planData.paystack_plan_code) {
      console.error("⚠️ Missing paystack_plan_code for plan:", planData.name);
      return NextResponse.json(
        { error: "Plan missing Paystack plan code" },
        { status: 400 }
      );
    }

    // 2️⃣ Fetch user email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    console.log("👤 User query result:", { userData, userError });

    if (userError || !userData?.email) {
      console.error("❌ User not found:", userError?.message);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3️⃣ Amount already in Kobo (don’t multiply by 100 again)
    const amountKobo = planData.monthly_price;
    console.log("💰 Amount (Kobo):", amountKobo);

    // 4️⃣ Initialize Paystack transaction
    console.log("🚀 Initializing Paystack transaction...");
    const initResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userData.email,
        amount: amountKobo, // already in Kobo
        currency: "NGN",
        plan: planData.paystack_plan_code, // ✅ attach Paystack plan for recurring billing
        metadata: {
          userId,
          planId,
          planName: planData.name,
        },
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/paystack/callback`,
      }),
    });

    const initData = await initResponse.json();
    console.log("📡 Paystack init response:", initData);

    if (!initData.status) {
      console.error("❌ Paystack error:", initData.message);
      return NextResponse.json(
        { error: initData.message || "Failed to initialize Paystack payment" },
        { status: 400 }
      );
    }

    // ✅ Return checkout URL
    console.log("✅ Paystack checkout URL:", initData.data.authorization_url);
    return NextResponse.json({ url: initData.data.authorization_url });
  } catch (err: any) {
    console.error("💥 Fatal error creating Paystack session:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
