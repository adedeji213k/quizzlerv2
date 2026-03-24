"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import {
  LogOut,
  Users,
  LayoutDashboard,
  Layers,
  CreditCard,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* 🔹 Import your admin components (create these next) */
import AdminOverview from "@/app/components/admin/AdminOverview";
import AdminUsers from "@/app/components/admin/AdminUsers";
import AdminPartners from "@/app/components/admin/AdminPartners";
import AdminSubscriptions from "@/app/components/admin/AdminSubscriptions";
import AdminQuizzes from "@/app/components/admin/AdminQuizzes";
import AdminFlashcards from "@/app/components/admin/AdminFlashcards";

function AdminDashboardInner() {
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) setCollapsed(true);
      else setCollapsed(false);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const fetchAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      setUser(session.user);

      // 🔐 CHECK ADMIN ROLE
      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (error || !userData || userData.role !== "admin") {
        await supabase.auth.signOut();
        router.push("/admin/login");
        return;
      }

      setLoading(false);
    };

    fetchAdmin();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) router.push("/admin/login");
      }
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const renderContent = () => {
    switch (active) {
      case "overview":
        return <AdminOverview />;
      case "users":
        return <AdminUsers />;
      case "partners":
        return <AdminPartners />;
      case "subscriptions":
        return <AdminSubscriptions />;
      case "quizzes":
        return <AdminQuizzes />;
      case "flashcards":
        return <AdminFlashcards />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground animate-pulse">
          Loading admin dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted to-background">

      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-20" : "w-72"
        } bg-card border-r border-border flex flex-col fixed h-full transition-all duration-300`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-border relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>

            {!collapsed && (
              <span className="text-xl font-bold">Admin</span>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-card border rounded-full p-1"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-2">
          {[
            { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
            { id: "users", label: "Users", icon: <Users size={18} /> },
            { id: "partners", label: "Partners", icon: <Users size={18} /> },
            { id: "subscriptions", label: "Subscriptions", icon: <CreditCard size={18} /> },
            { id: "quizzes", label: "Quizzes", icon: <BookOpen size={18} /> },
            { id: "flashcards", label: "Flashcards", icon: <Layers size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`flex items-center w-full px-4 py-3 rounded-lg text-sm transition ${
                active === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {!collapsed && item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg"
          >
            <LogOut size={18} className="mr-3" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        className={`flex-1 ${
          collapsed ? "ml-20" : "ml-72"
        } p-6 overflow-y-auto`}
      >
        <div className="bg-card rounded-2xl border p-6 min-h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <AdminDashboardInner />
    </Suspense>
  );
}