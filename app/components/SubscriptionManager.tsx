'use client';

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
        // 1️⃣ Fetch all plans
        const { data: plansData, error: plansError } = await supabase
          .from("plans")
          .select("*");
        if (plansError) throw plansError;
        if (plansData) setPlans(plansData);

        // 2️⃣ Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session || sessionError) throw new Error("Not logged in");

        const userId = session.user.id;

        // 3️⃣ Fetch subscription for the current user
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select(`
            status,
            current_period_end,
            plan:plans(id, name)
          `)
          .eq("user_id", userId)
          .limit(1);

        if (subError && subError.code !== "PGRST116") throw subError; // ignore no row found

        if (subData && subData.length > 0) {
          const sub = subData[0];
          const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;

          setSubscription({
            plan_name: plan?.name ?? "Unknown Plan",
            status: sub.status ?? "inactive",
            current_period_end: sub.current_period_end ?? new Date().toISOString(),
          });
        } else {
          // No subscription found → Free plan
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
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
      <div className="flex justify-center items-center p-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="p-6 border rounded-xl bg-card shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Current Plan</h2>
        {subscription ? (
          <div className="space-y-1">
            <p><strong>Plan:</strong> {subscription.plan_name}</p>
            <p><strong>Status:</strong> {subscription.status}</p>
            <p>
              <strong>Expires:</strong>{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p>You are currently on the Free plan.</p>
        )}
      </div>

      {/* Upgrade Options */}
      <div className="p-6 border rounded-xl bg-card shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Upgrade Plan</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="border rounded-lg p-4 flex flex-col justify-between bg-background"
            >
              <div>
                <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                <p className="mb-2">
                  <strong>Price:</strong> ${(plan.monthly_price / 100).toFixed(2)} / month
                </p>
                <p className="mb-2">
                  <strong>AI Limit:</strong>{" "}
                  {plan.ai_limit > 100_000 ? "Unlimited" : plan.ai_limit}
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleUpgrade(plan)}
                disabled={checkoutLoading}
                className="mt-4 w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
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
