"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import {
  LogOut,
  ClipboardList,
  BookOpen,
  BarChart2,
  Sparkles,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TakeQuiz from "../components/TakeQuiz";
import MyQuizzes from "../components/MyQuizzes";
import Results from "../components/Results";
import SubscriptionManager from "../components/SubscriptionManager";
import UserSettings from "../components/UserSettings";

interface SubscriptionInfo {
  plan: string;
  expires: string;
}

function DashboardInner() {
  const [active, setActive] = useState("takeQuiz");
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 🔹 Collapse automatically on tablet (≤1024px)
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize(); // run once on mount
    window.addEventListener("resize", handleResize);

    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      try {
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("status, current_period_end, plans(name)")
          .eq("user_id", session.user.id)
          .single();

        if (subData) {
          const planObj = Array.isArray(subData.plans)
            ? subData.plans[0]
            : subData.plans;
          setSubscription({
            plan: planObj?.name ?? "Unknown",
            expires: subData.current_period_end
              ? new Date(subData.current_period_end).toLocaleDateString()
              : "N/A",
          });
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
      }

      const tab = searchParams.get("tab");
      if (tab === "subscription") {
        setShowSubscriptionManager(true);
        setShowUserSettings(false);
        setActive("");
      }

      setLoading(false);
    };

    fetchData();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/login");
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      listener.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const renderContent = () => {
    if (showUserSettings) return <UserSettings user={user} />;
    if (showSubscriptionManager) return <SubscriptionManager />;

    switch (active) {
      case "takeQuiz":
        return <TakeQuiz />;
      case "myQuizzes":
        return <MyQuizzes />;
      case "results":
        return <Results />;
      default:
        return null;
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-muted to-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-20" : "w-72"
        } bg-card border-r border-border shadow-md flex flex-col h-full fixed left-0 top-0 bottom-0 transition-all duration-300 z-40`}
      >
        {/* Logo & Collapse Button */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-border relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>

            {/* Hide text when collapsed */}
            {!collapsed && (
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent whitespace-nowrap">
                Quizzler
              </span>
            )}
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-card border border-border rounded-full p-1 shadow hover:bg-muted transition"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-2 mt-2">
          {[
            { id: "takeQuiz", label: "Take Quiz", icon: <ClipboardList size={18} /> },
            { id: "myQuizzes", label: "My Quizzes", icon: <BookOpen size={18} /> },
            { id: "results", label: "Results", icon: <BarChart2 size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActive(item.id);
                setShowSubscriptionManager(false);
                setShowUserSettings(false);
              }}
              className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                active === item.id
                  ? "bg-gradient-to-r from-primary/10 to-accent/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="mr-3 flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm space-y-2 mt-auto">
          <button
            onClick={() => {
              setShowUserSettings(true);
              setShowSubscriptionManager(false);
              setActive("");
            }}
            className="flex items-center w-full px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"
          >
            <User size={18} className="mr-3 flex-shrink-0" />
            {!collapsed && (user?.user_metadata?.full_name || user?.email)}
          </button>

          <button
            onClick={() => {
              setShowSubscriptionManager(true);
              setShowUserSettings(false);
              setActive("");
            }}
            className="flex items-center w-full px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"
          >
            <CreditCard size={18} className="mr-3 flex-shrink-0" />
            {!collapsed &&
              (subscription
                ? `Plan: ${subscription.plan} (${subscription.expires})`
                : "Manage Plan")}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-destructive rounded-lg hover:bg-destructive/10 transition"
          >
            <LogOut size={18} className="mr-3 flex-shrink-0" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 ${
          collapsed ? "ml-20" : "ml-72"
        } h-screen overflow-y-auto p-4 md:p-8 transition-all duration-300`}
      >
        <div className="bg-card rounded-2xl border border-border p-4 md:p-8 shadow-md min-h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

/* ✅ Suspense Wrapper */
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading dashboard...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
