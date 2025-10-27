'use client';

import { useEffect, useState } from "react";
import { LogOut, ClipboardList, BookOpen, BarChart2, Sparkles, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TakeQuiz from "../components/TakeQuiz";
import MyQuizzes from "../components/MyQuizzes";
import Results from "../components/Results";
import SubscriptionManager from "../components/SubscriptionManager";

interface SubscriptionInfo {
  plan: string;
  expires: string;
}

export default function DashboardPage() {
  const [active, setActive] = useState("takeQuiz");
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      try {
        const { data: subData, error } = await supabase
          .from("subscriptions")
          .select(`
            status,
            current_period_end,
            plans(name)
          `)
          .eq("user_id", session.user.id)
          .single();

        if (!error && subData) {
          // subData.plans can be an array or null
          const planObj = Array.isArray(subData.plans) ? subData.plans[0] : subData.plans;

          setSubscription({
            plan: planObj?.name ?? "Unknown Plan",
            expires: subData.current_period_end
              ? new Date(subData.current_period_end).toLocaleDateString()
              : "N/A",
          });
        }
      } catch (err: any) {
        console.error("Error fetching subscription data:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/login");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleShowSubscription = () => {
    setShowSubscriptionManager(true);
  };

  const menuItems = [
    { id: "takeQuiz", label: "Take Quiz", icon: <ClipboardList size={18} /> },
    { id: "myQuizzes", label: "My Quizzes", icon: <BookOpen size={18} /> },
    { id: "results", label: "Results", icon: <BarChart2 size={18} /> },
  ];

  const renderContent = () => {
    if (showSubscriptionManager) return <SubscriptionManager />;
    switch (active) {
      case "takeQuiz": return <TakeQuiz />;
      case "myQuizzes": return <MyQuizzes />;
      case "results": return <Results />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-lg text-muted-foreground animate-pulse">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-muted to-background text-foreground">
      {/* Sidebar */}
      <aside className="w-72 bg-card border-r border-border shadow-[var(--shadow-elegant)] flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Quizzler
          </span>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActive(item.id); setShowSubscriptionManager(false); }}
              className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                active === item.id
                  ? "bg-gradient-to-r from-primary/10 to-accent/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Subscription & Logout */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleShowSubscription}
            className="flex items-center w-full px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"
          >
            <CreditCard size={18} className="mr-3" />
            {subscription
              ? `Plan: ${subscription.plan} (expires ${subscription.expires})`
              : "View / Upgrade Plan"}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-destructive rounded-lg hover:bg-destructive/10 transition"
          >
            <LogOut size={18} className="mr-3" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-[var(--shadow-elegant)]">
          {renderContent()}
        </div>
      </main>

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.1),transparent_70%)]"></div>
    </div>
  );
}
