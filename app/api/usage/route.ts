import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// ✅ New Plan Limits (based on your current pricing tiers)
const PLAN_LIMITS = {
  Free: {
    ai_calls: 50,               // up to 50 AI-generated questions per month
    documents_uploaded: 3,      // up to 3 docs per month
    quizzes_created: 5,         // up to 5 total quizzes
  },
  Standard: {
    ai_calls: 400,              // 300–400 AI questions per month
    documents_uploaded: 15,     // up to 15 docs per month
    quizzes_created: 50,        // up to 50 quizzes total
  },
  Pro: {
    ai_calls: -1,               // Unlimited
    documents_uploaded: -1,     // Unlimited
    quizzes_created: -1,        // Unlimited
  },
} as const;

type PlanName = keyof typeof PLAN_LIMITS;

export async function POST(req: Request) {
  try {
    const { userId, type } = await req.json(); // type = "ai_calls" | "documents_uploaded" | "quizzes_created"
    if (!userId || !type)
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );

    // 1️⃣ Get user's active plan
    const { data: subData, error: subError } = await supabaseServer
      .from("subscriptions")
      .select("status, plan:plans(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== "PGRST116") throw subError;

    // 2️⃣ Determine plan name (handle array/object/null)
    let planName: string = "Free";
    if (Array.isArray(subData?.plan)) {
      planName = subData.plan[0]?.name || "Free";
    } else if (subData?.plan && typeof subData.plan === "object") {
      planName = (subData.plan as { name?: string })?.name || "Free";
    }

    // 3️⃣ Validate plan key
    const validPlan: PlanName = (["Free", "Standard", "Pro"].includes(planName)
      ? planName
      : "Free") as PlanName;

    const limits = PLAN_LIMITS[validPlan];
    const limit = limits[type as keyof typeof limits] ?? 0;

    // 4️⃣ Get or create usage record
    let { data: usage, error: usageError } = await supabaseServer
      .from("usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (usageError && usageError.code !== "PGRST116") throw usageError;

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Create a new record if none exists
    if (!usage) {
      const { data: newUsage, error: insertError } = await supabaseServer
        .from("usage")
        .insert({ user_id: userId })
        .select()
        .single();
      if (insertError) throw insertError;
      usage = newUsage;
    }

    // 5️⃣ Reset monthly usage if older than one month
    const lastReset = new Date(usage.last_reset);
    if (lastReset < oneMonthAgo) {
      await supabaseServer
        .from("usage")
        .update({
          ai_calls: 0,
          documents_uploaded: 0,
          quizzes_created: 0,
          last_reset: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("user_id", userId);

      usage.ai_calls = 0;
      usage.documents_uploaded = 0;
      usage.quizzes_created = 0;
    }

    // 6️⃣ Enforce limit
    const current = usage[type] ?? 0;
    if (limit !== -1 && current >= limit) {
      return NextResponse.json(
        {
          upgrade: true,
          plan: validPlan,
          message: `You’ve reached your ${validPlan} plan limit for ${type.replace(
            "_",
            " "
          )} (${limit}).`,
        },
        { status: 403 }
      );
    }

    // 7️⃣ Increment usage count
    const newValue = current + 1;
    const { error: updateError } = await supabaseServer
      .from("usage")
      .update({
        [type]: newValue,
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    // ✅ Success response
    return NextResponse.json({
      success: true,
      type,
      used: newValue,
      remaining: limit === -1 ? "Unlimited" : limit - newValue,
      limit,
      plan: validPlan,
    });
  } catch (err: any) {
    console.error("❌ Usage API error:", err.message);
    return NextResponse.json(
      { error: "Failed to check usage", details: err.message },
      { status: 500 }
    );
  }
}
