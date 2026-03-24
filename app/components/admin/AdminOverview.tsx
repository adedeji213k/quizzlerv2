'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Users, BookOpen, Layers, CreditCard, DollarSign } from "lucide-react";

interface KPI {
  label: string;
  value: number | string;
  icon: JSX.Element;
}

interface RecentActivity {
  id: string;
  type: string;
  user: string;
  title?: string;
  created_at: string;
  action: string;
}

export default function AdminOverview() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [growth, setGrowth] = useState({
    usersWeek: 0,
    quizzesToday: 0,
    newSubsMonth: 0
  });
  const [alerts, setAlerts] = useState<string[]>([]);
  const [usage, setUsage] = useState({
    avgQuizzesPerUser: 0,
    avgScore: 0,
    mostUsedFeature: "N/A"
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topUsers, setTopUsers] = useState<{ name: string; quizzes: number }[]>([]);
  const [topPartners, setTopPartners] = useState<{ name: string; referrals: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);

        // --- KPI Cards ---
        const results = await Promise.all([
          supabase.from("users").select("*", { count: "exact" }),
          supabase.from("quizzes").select("*", { count: "exact" }),
          supabase.from("flashcard_sets").select("*", { count: "exact" }),
          supabase.from("subscriptions").select("*", { count: "exact" }).eq("status", "active"),
          supabase.from("payments").select("amount"),
          supabase.from("users").select("*", { count: "exact" }).eq("role", "partner")
        ]);

        const totalUsers = results[0].count || 0;
        const totalQuizzes = results[1].count || 0;
        const totalFlashcards = results[2].count || 0;
        const activeSubs = results[3].count || 0;
        const revenueData = results[4].data || [];
        const totalPartners = results[5].count || 0;

        const totalRevenue = revenueData.reduce((sum: number, item: any) => sum + item.amount, 0);

        setKpis([
          { label: "Total Users", value: totalUsers, icon: <Users className="w-6 h-6 text-primary" /> },
          { label: "Quizzes Created", value: totalQuizzes, icon: <BookOpen className="w-6 h-6 text-primary" /> },
          { label: "Flashcards", value: totalFlashcards, icon: <Layers className="w-6 h-6 text-primary" /> },
          { label: "Active Subscriptions", value: activeSubs, icon: <CreditCard className="w-6 h-6 text-primary" /> },
          { label: "Revenue", value: `$${totalRevenue}`, icon: <DollarSign className="w-6 h-6 text-primary" /> },
          { label: "Total Partners", value: totalPartners, icon: <Users className="w-6 h-6 text-accent" /> },
        ]);

        // --- Growth ---
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const [usersWeekData, quizzesTodayData, newSubsMonthData] = await Promise.all([
          supabase.from("users").select("*").gte("created_at", weekAgo.toISOString()),
          supabase.from("quizzes").select("*").gte("created_at", todayStr),
          supabase.from("subscriptions").select("*").gte("created_at", monthAgo.toISOString()),
        ]);

        setGrowth({
          usersWeek: usersWeekData.data?.length || 0,
          quizzesToday: quizzesTodayData.data?.length || 0,
          newSubsMonth: newSubsMonthData.data?.length || 0
        });

        // --- Alerts ---
        const [failedPaymentsData, inactiveUsersData, inactivePartnersData] = await Promise.all([
          supabase.from("payments").select("*").eq("status", "failed"),
          supabase.from("users").select("*").lt("last_active", new Date(Date.now() - 30*24*60*60*1000).toISOString()),
          supabase.from("users").select("*").lt("last_active", new Date(Date.now() - 30*24*60*60*1000).toISOString()).eq("role", "partner"),
        ]);

        const newAlerts: string[] = [];
        if (failedPaymentsData.data?.length) newAlerts.push(`❌ ${failedPaymentsData.data.length} failed payments`);
        if (inactiveUsersData.data?.length) newAlerts.push(`🚨 ${inactiveUsersData.data.length} inactive users`);
        if (inactivePartnersData.data?.length) newAlerts.push(`💤 ${inactivePartnersData.data.length} inactive partners`);
        setAlerts(newAlerts);

        // --- Usage ---
        const avgQuizzesPerUser = totalUsers ? (totalQuizzes / totalUsers) : 0;
        const avgScore = 75;
        const mostUsedFeature = totalQuizzes > totalFlashcards ? "Quizzes" : "Flashcards";

        setUsage({ avgQuizzesPerUser, avgScore, mostUsedFeature });

        // --- Recent Activity ---
        const [usersRes, quizzesRes, subsRes] = await Promise.all([
          supabase.from("users").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("quizzes").select("id, title, user_id, created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("subscriptions").select("id, user_id, created_at").order("created_at", { ascending: false }).limit(5),
        ]);

        const userIds = [
          ...(quizzesRes.data?.map(q => q.user_id) || []),
          ...(subsRes.data?.map(s => s.user_id) || []),
          ...(usersRes.data?.map(u => u.id) || [])
        ];

        const { data: userMapData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);

        const userMap: Record<string, string> = {};
        userMapData?.forEach(u => {
          userMap[u.id] = u.name || "Unknown";
        });

        const activity: RecentActivity[] = [];

        usersRes.data?.slice(0, 3).forEach(u => {
          activity.push({
            id: u.id,
            type: "user",
            user: u.name || "Unknown",
            created_at: u.created_at,
            action: "Joined"
          });
        });

        quizzesRes.data?.slice(0, 4).forEach(q => {
          activity.push({
            id: q.id,
            type: "quiz",
            user: userMap[q.user_id] || "Unknown",
            title: q.title,
            created_at: q.created_at,
            action: "Created Quiz"
          });
        });

        subsRes.data?.slice(0, 3).forEach(s => {
          activity.push({
            id: s.id,
            type: "subscription",
            user: userMap[s.user_id] || "Unknown",
            created_at: s.created_at,
            action: "Subscribed"
          });
        });

        activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentActivity(activity.slice(0, 10));

        // --- Top Users (FIXED: no group) ---
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("user_id");

        const userCountMap: Record<string, number> = {};

        quizzesData?.forEach(q => {
          userCountMap[q.user_id] = (userCountMap[q.user_id] || 0) + 1;
        });

        const sortedUsers = Object.entries(userCountMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        setTopUsers(
          sortedUsers.map(([userId, count]) => ({
            name: userMap[userId] || userId,
            quizzes: count
          }))
        );

        // --- Top Partners ---
        const { data: topPartnersData } = await supabase
          .from("users")
          .select("full_name, referrals_count")
          .order("referrals_count", { ascending: false })
          .limit(5);

        setTopPartners(
          topPartnersData?.map(p => ({
            name: p.full_name,
            referrals: p.referrals_count
          })) || []
        );

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return <p className="text-muted-foreground animate-pulse">Loading overview...</p>;
  }

  return (
    <div className="space-y-8">

      <h1 className="text-3xl font-bold">Overview</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="p-5 rounded-xl border bg-card flex items-center gap-4">
            {kpi.icon}
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <h2 className="text-2xl font-bold">{kpi.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Growth */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 border rounded-xl bg-card">
          <p>Users This Week</p>
          <h2 className="text-xl font-bold">+{growth.usersWeek}</h2>
        </div>
        <div className="p-5 border rounded-xl bg-card">
          <p>Quizzes Today</p>
          <h2 className="text-xl font-bold">+{growth.quizzesToday}</h2>
        </div>
        <div className="p-5 border rounded-xl bg-card">
          <p>New Subscriptions</p>
          <h2 className="text-xl font-bold">+{growth.newSubsMonth}</h2>
        </div>
      </div>

      {/* Usage */}
      <div className="p-5 border rounded-xl bg-card grid md:grid-cols-3 gap-4">
        <div>
          <p>Avg Quizzes/User</p>
          <h2 className="font-bold">{usage.avgQuizzesPerUser.toFixed(2)}</h2>
        </div>
        <div>
          <p>Avg Score</p>
          <h2 className="font-bold">{usage.avgScore}%</h2>
        </div>
        <div>
          <p>Most Used</p>
          <h2 className="font-bold">{usage.mostUsedFeature}</h2>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-5 border rounded-xl bg-card">
        <h2 className="font-semibold mb-4">Recent Activity</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2">User</th>
                <th className="py-2">Action</th>
                <th className="py-2">Title</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.user}</td>
                  <td className="py-2">{a.action}</td>
                  <td className="py-2">{a.title || "-"}</td>
                  <td className="py-2">{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      

    </div>
  );
}