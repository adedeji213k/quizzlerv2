import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const PLAN_LIMITS = {
  Free: { ai_calls: 10, documents_uploaded: 5, quizzes_created: 3 },
  Standard: { ai_calls: 100, documents_uploaded: 50, quizzes_created: 25 },
  Pro: { ai_calls: -1, documents_uploaded: -1, quizzes_created: -1 }, // Unlimited
} as const;

type PlanName = keyof typeof PLAN_LIMITS;

export async function POST(req: Request) {
  try {
    const { userId, type } = await req.json(); // type = "ai_calls" | "documents_uploaded" | "quizzes_created"
    if (!userId || !type)
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    // 1️⃣ Get user's latest subscription plan
    const { data: subData, error: subError } = await supabaseServer
      .from("subscriptions")
      .select("status, plan:plans(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== "PGRST116") throw subError;

    // Handle cases where plan may be an array or null
    let planName: string = "Free";
    if (Array.isArray(subData?.plan)) {
      planName = subData?.plan[0]?.name || "Free";
    } else if (subData?.plan && typeof subData.plan === "object") {
      planName = (subData.plan as { name?: string })?.name || "Free";
    }

    // ✅ Ensure valid plan key
    const validPlan: PlanName = (["Free", "Standard", "Pro"].includes(planName)
      ? planName
      : "Free") as PlanName;

    const limits = PLAN_LIMITS[validPlan];
    const limit = limits[type as keyof typeof limits] ?? 0;

    // 2️⃣ Get or create usage record
    let { data: usage, error: usageError } = await supabaseServer
      .from("usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (usageError && usageError.code !== "PGRST116") throw usageError;

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    if (!usage) {
      const { data: newUsage, error: insertError } = await supabaseServer
        .from("usage")
        .insert({ user_id: userId })
        .select()
        .single();
      if (insertError) throw insertError;
      usage = newUsage;
    }

    // 3️⃣ Reset monthly usage if older than 1 month
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

    // 4️⃣ Enforce usage limit
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

    // 5️⃣ Increment and update usage
    const newValue = current + 1;
    const { error: updateError } = await supabaseServer
      .from("usage")
      .update({
        [type]: newValue,
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

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
