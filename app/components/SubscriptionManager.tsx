"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  monthly_price: number; // in cents
  ai_limit: number;
  features: string[];
}

interface Subscription {
  plan_name: string;
  status: string;
  current_period_end: string;
}

export default function SubscriptionManager() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all plans
        const { data: plansData, error: plansError } = await supabase
          .from("plans")
          .select("*");
        if (plansError) throw plansError;
        setPlans(plansData || []);

        // Get session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (!session || sessionError) throw new Error("Not logged in");

        const userId = session.user.id;

        // Fetch latest subscription
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select(
            `
            status,
            current_period_end,
            created_at,
            plan:plans(id, name)
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
            plan_name: plan?.name ?? "Unknown Plan",
            status: sub.status ?? "inactive",
            current_period_end:
              sub.current_period_end ?? new Date().toISOString(),
          });
        } else {
          setSubscription(null);
        }
      } catch (err: any) {
        console.error("Error fetching subscription data:", err);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    setCheckoutLoading(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (!session || sessionError) throw new Error("Not logged in");

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          userId: session.user.id,
        }),
      });

      const data = await res.json();
      if (!data.url) throw new Error(data.error || "Failed to get checkout URL");

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert("Failed to start checkout: " + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading subscription
        data...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Subscription & Billing
      </h2>

      {/* Current Plan Card */}
      <div className="bg-card border border-border rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-3 text-foreground">
          Current Plan
        </h3>
        {subscription ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Plan:</strong>{" "}
              {subscription.plan_name}
            </p>
            <p>
              <strong className="text-foreground">Status:</strong>{" "}
              {subscription.status}
            </p>
            <p>
              <strong className="text-foreground">Renews:</strong>{" "}
              {new Date(
                subscription.current_period_end
              ).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            You are currently on the{" "}
            <span className="text-foreground font-medium">Free</span> plan.
          </p>
        )}
      </div>

      {/* Available Plans */}
      <div className="bg-card border border-border rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-foreground">
          Upgrade Your Plan
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-background border border-border rounded-xl shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div>
                <h4 className="text-lg font-semibold mb-2 text-foreground">
                  {plan.name}
                </h4>
                <p className="text-muted-foreground mb-2">
                  <strong className="text-foreground">Price:</strong>{" "}
                  ${(plan.monthly_price / 100).toFixed(2)} / month
                </p>
                <p className="text-muted-foreground mb-3">
                  <strong className="text-foreground">AI Limit:</strong>{" "}
                  {plan.ai_limit > 100_000 ? "Unlimited" : plan.ai_limit}
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleUpgrade(plan)}
                disabled={checkoutLoading}
                className="mt-5 w-full py-2 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {checkoutLoading ? "Processing..." : "Upgrade"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
