"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  monthly_price: number; // stored in Kobo
  features: string[];
}

interface Subscription {
  plan_name: string;
  status: string;
  current_period_end: string | null;
}

const CREDIT_BUNDLES = [
  {
    id: "credits_5",
    price: 20000, // kobo
    credits: 5,
    label: "₦200 → 1 quiz",
  },
  {
    id: "credits_15",
    price: 50000,
    credits: 15,
    label: "₦500 → 3 quizzes",
  },
  {
    id: "credits_35",
    price: 100000,
    credits: 35,
    label: "₦1,000 → 7 quizzes",
  },
];


export default function SubscriptionManager() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  /* ---------------------------
     Helpers
  ---------------------------- */
  const currentPlanName = subscription?.plan_name ?? "Free";

  const isFreePlan = (plan: Plan) => plan.monthly_price === 0;

  const isCurrentPlan = (plan: Plan) =>
    plan.name.toLowerCase() === currentPlanName.toLowerCase();

  /* ---------------------------
     Fetch data
  ---------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) throw new Error("Not logged in");

        const userId = session.user.id;

        // Fetch plans
        const { data: plansData, error: plansError } = await supabase
          .from("plans")
          .select("id, name, monthly_price, features")
          .order("monthly_price", { ascending: true });

        if (plansError) throw plansError;
        setPlans(plansData || []);

        // Fetch latest subscription
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select(
            `
            status,
            current_period_end,
            created_at,
            plan:plans(name)
          `
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (subError && subError.code !== "PGRST116") throw subError;

        if (subData && subData.length > 0) {
          const sub = subData[0];
          const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;

          setSubscription({
            plan_name: plan?.name ?? "Free",
            status: sub.status ?? "inactive",
            current_period_end: sub.current_period_end,
          });
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error("Error fetching subscription data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* ---------------------------
     Paid upgrade (Paystack)
  ---------------------------- */
  const handleUpgrade = async (plan: Plan) => {
    setCheckoutLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Not logged in");

      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          userId: session.user.id,
        }),
      });

      const data = await res.json();
      if (!data.url) throw new Error(data.error || "Failed to start checkout");

      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      alert("Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* ---------------------------
     Downgrade to FREE (no Paystack)
  ---------------------------- */
  const handleDowngradeToFree = async () => {
    const confirmDowngrade = confirm(
      "Downgrading will remove paid features. Continue?"
    );
    if (!confirmDowngrade) return;

    setCheckoutLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Not logged in");

      const userId = session.user.id;
      const freePlan = plans.find((p) => p.monthly_price === 0);

      if (!freePlan) throw new Error("Free plan not found");

      // Cancel active subscription
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .eq("status", "active");

      // Insert free subscription
      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_id: freePlan.id,
        status: "active",
        current_period_end: null,
      });

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to downgrade");
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* ---------------------------
     Loading
  ---------------------------- */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading subscription data...
      </div>
    );
  }

  /* ---------------------------
     UI
  ---------------------------- */
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Subscription & Billing
      </h2>

      {/* Current Plan */}
      <div className="bg-card border border-border rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-3">Current Plan</h3>

        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Plan:</strong>{" "}
          {currentPlanName}
        </p>

        {subscription?.current_period_end && (
          <p className="text-sm text-muted-foreground mt-1">
            <strong className="text-foreground">Renews:</strong>{" "}
            {new Date(subscription.current_period_end).toLocaleDateString()}
          </p>
        )}
      </div>

      
      {/* Credit Bundles */}
<div className="bg-card border border-border rounded-xl shadow-md p-6">
  <h3 className="text-xl font-semibold mb-4">Buy Quiz Credits</h3>

  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {CREDIT_BUNDLES.map((bundle) => (
      <div
        key={bundle.id}
        className="bg-background border border-border rounded-xl p-6 flex flex-col justify-between"
      >
        <div>
          <h4 className="text-lg font-semibold mb-2">
            {bundle.credits} Credits
          </h4>
          <p className="text-muted-foreground mb-3">
            {bundle.label}
          </p>
        </div>

        <button
          disabled={checkoutLoading}
          onClick={async () => {
            setCheckoutLoading(true);
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();

              if (!session) throw new Error("Not logged in");

              const res = await fetch("/api/paystack/init-credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bundleId: bundle.id,
                  userId: session.user.id,
                }),
              });

              const data = await res.json();
              if (!data.url) throw new Error("Failed to start checkout");

              window.location.href = data.url;
            } catch (e) {
              alert("Failed to start credit purchase");
            } finally {
              setCheckoutLoading(false);
            }
          }}
          className="mt-4 w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-primary to-accent"
        >
          Buy Credits
        </button>
      </div>
    ))}
  </div>
</div>


      {/* Plans */}
      <div className="bg-card border border-border rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Plans</h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-background border border-border rounded-xl p-6 flex flex-col justify-between transition hover:shadow-lg"
            >
              <div>
                <h4 className="text-lg font-semibold mb-2">{plan.name}</h4>

                <p className="text-muted-foreground mb-3">
                  ₦
                  {(plan.monthly_price / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                  / month
                </p>

                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {plan.features?.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <button
                disabled={checkoutLoading || isCurrentPlan(plan)}
                onClick={() => {
                  if (isCurrentPlan(plan)) return;

                  if (isFreePlan(plan)) {
                    handleDowngradeToFree();
                  } else {
                    handleUpgrade(plan);
                  }
                }}
                className="mt-5 w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-primary to-accent disabled:opacity-50"
              >
                {isCurrentPlan(plan)
                  ? "Current Plan"
                  : isFreePlan(plan)
                  ? "Downgrade"
                  : "Upgrade"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
