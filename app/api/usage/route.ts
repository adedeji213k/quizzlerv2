import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const QUIZ_CREDIT_COST = 2.5;

// ✅ Plan limits (subscriptions only)
const PLAN_LIMITS = {
  Free: {
    ai_calls: 50,
    documents_uploaded: -1,
    quizzes_created: 0, // handled by credits
  },
  Standard: {
    ai_calls: 400,
    documents_uploaded: 15,
    quizzes_created: 15,
  },
  Pro: {
    ai_calls: -1,
    documents_uploaded: -1,
    quizzes_created: -1,
  },
} as const;

type PlanName = keyof typeof PLAN_LIMITS;

export async function POST(req: Request) {
  try {
    const { userId, type } = await req.json();

    if (!userId || !type) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    /**
     * 1️⃣ Get latest subscription
     */
    const { data: subData } = await supabaseServer
      .from("subscriptions")
      .select("status, plan:plans(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let planName: PlanName = "Free";

    if (subData?.status === "active") {
      if (Array.isArray(subData.plan)) {
        planName = (subData.plan[0]?.name as PlanName) || "Free";
      } else if (subData.plan?.name) {
        planName = subData.plan.name as PlanName;
      }
    }

    if (!["Free", "Standard", "Pro"].includes(planName)) {
      planName = "Free";
    }

    const limits = PLAN_LIMITS[planName];
    const limit = limits[type as keyof typeof limits] ?? 0;

    /**
     * 2️⃣ Get or create usage row
     */
    let { data: usage } = await supabaseServer
      .from("usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!usage) {
      const { data: newUsage } = await supabaseServer
        .from("usage")
        .insert({ user_id: userId })
        .select()
        .single();

      usage = newUsage;
    }

    /**
     * 3️⃣ QUIZ CREATION CHECK
     */
    if (type === "quizzes_created") {
      /**
       * 🟢 PAID USERS → subscription-based
       */
      if (planName !== "Free") {
        const current = usage.quizzes_created ?? 0;

        if (limit !== -1 && current >= limit) {
          return NextResponse.json(
            {
              upgrade: true,
              message: `You’ve reached your ${planName} quiz limit.`,
            },
            { status: 403 }
          );
        }

        return NextResponse.json({
          success: true,
          plan: planName,
          shouldDebitCredits: false,
        });
      }

      /**
       * 🔵 FREE USERS → credit-based authorization only
       */
      const { data: creditRow } = await supabaseServer
        .from("credits_balance")
        .select("balance")
        .eq("id", userId)
        .single();

      if (!creditRow || creditRow.balance < QUIZ_CREDIT_COST) {
        return NextResponse.json(
          {
            upgrade: true,
            message: `You need ${QUIZ_CREDIT_COST} credits to generate a quiz.`,
            balance: creditRow?.balance ?? 0,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        plan: "Free",
        shouldDebitCredits: true,
        creditCost: QUIZ_CREDIT_COST,
      });
    }

    /**
     * 4️⃣ NON-QUIZ USAGE (AI calls, documents, etc.)
     */
    const current = usage[type] ?? 0;

    if (limit !== -1 && current >= limit) {
      return NextResponse.json(
        {
          upgrade: true,
          message: `You’ve reached your ${planName} limit for ${type.replace(
            "_",
            " "
          )}.`,
        },
        { status: 403 }
      );
    }

    await supabaseServer
      .from("usage")
      .update({
        [type]: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return NextResponse.json({
      success: true,
      plan: planName,
    });
  } catch (err: any) {
    console.error("❌ Usage API error:", err.message);
    return NextResponse.json(
      { error: "Failed to check usage" },
      { status: 500 }
    );
  }
}
