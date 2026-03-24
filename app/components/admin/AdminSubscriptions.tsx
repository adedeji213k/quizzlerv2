'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ExternalLink, CircleX } from "lucide-react";

interface Subscription {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string | null;
  plan_name: string | null;
  plan_price: number | null;
  status: string | null;
  current_period_end: string | null;
  created_at: string;
  payment_provider?: string;
}

interface Transaction {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

const SUBS_PER_PAGE = 20;

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const [stats, setStats] = useState({
    totalActive: 0,
    mrr: 0,
    failedPayments: 0,
    freeUsers: 0,
    paidUsers: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterSubs();
    setCurrentPage(1);
  }, [search, planFilter, statusFilter, subscriptions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select(`
          id,
          user_id,
          status,
          current_period_end,
          created_at,
          plan_id,
          plans!inner(name, monthly_price)
        `)
        .order('created_at', { ascending: false });

      const { data: usersData } = await supabase
        .from("users")
        .select("id, email");

      const usersMap: Record<string, string> = {};
      usersData?.forEach(u => { usersMap[u.id] = u.email; });

      const enrichedSubs: Subscription[] = subsData?.map(s => ({
        id: s.id,
        user_id: s.user_id,
        user_email: usersMap[s.user_id] || "Unknown",
        plan_id: s.plan_id,
        plan_name: s.plans?.name || "Free",
        plan_price: s.plans?.monthly_price || 0, // still in kobo
        status: s.status,
        current_period_end: s.current_period_end,
        created_at: s.created_at,
        payment_provider: s.stripe_subscription_id ? "Stripe" : s.paystack_plan_code ? "Paystack" : undefined,
      })) || [];

      setSubscriptions(enrichedSubs);

      const { data: txData } = await supabase
        .from("transactions")
        .select("id, user_id, amount, type, status, created_at");

      const enrichedTx: Transaction[] = txData?.map(t => ({
        ...t,
        user_email: usersMap[t.user_id] || "Unknown",
      })) || [];

      setTransactions(enrichedTx);

      // ✅ Convert kobo → naira here
      const activeSubs = enrichedSubs.filter(s => s.status === "active");
      const mrr = activeSubs.reduce((sum, s) => sum + ((s.plan_price || 0) / 100), 0);
      const failed = enrichedTx.filter(t => t.status === "failed").length;
      const freeUsers = enrichedSubs.filter(s => !s.plan_id).length;
      const paidUsers = enrichedSubs.filter(s => s.plan_id).length;

      setStats({ totalActive: activeSubs.length, mrr, failedPayments: failed, freeUsers, paidUsers });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterSubs = () => {
    let data = [...subscriptions];
    if (search) {
      data = data.filter(s =>
        s.user_email.toLowerCase().includes(search.toLowerCase()) ||
        (s.plan_name && s.plan_name.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (planFilter !== "all") {
      data = data.filter(s => (s.plan_name || "Free").toLowerCase() === planFilter);
    }
    if (statusFilter !== "all") {
      data = data.filter(s => s.status?.toLowerCase() === statusFilter);
    }
    setFilteredSubs(data);
  };

  const totalPages = Math.ceil(filteredSubs.length / SUBS_PER_PAGE);
  const paginatedSubs = filteredSubs.slice(
    (currentPage - 1) * SUBS_PER_PAGE,
    currentPage * SUBS_PER_PAGE
  );

  if (loading) return <p className="animate-pulse">Loading subscriptions...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscriptions</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Active Subs" value={stats.totalActive} />
        <StatCard label="MRR (₦)" value={stats.mrr} />
        <StatCard label="Failed Payments" value={stats.failedPayments} />
        <StatCard label="Free Users" value={stats.freeUsers} />
        <StatCard label="Paid Users" value={stats.paidUsers} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search by email or plan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-xl bg-background"
        />
        <select onChange={e => setPlanFilter(e.target.value)} className="border rounded-xl px-2">
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          {Array.from(new Set(subscriptions.map(s => s.plan_name).filter(Boolean))).map(plan => (
            <option key={plan} value={plan?.toLowerCase()}>{plan}</option>
          ))}
        </select>
        <select onChange={e => setStatusFilter(e.target.value)} className="border rounded-xl px-2">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-2xl bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-3 text-left">User Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Price</th>
              <th>Current Period End</th>
              <th>Created At</th>
              <th>Payment Provider</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSubs.map(s => (
              <tr key={s.id} className="border-b hover:bg-muted/40 transition">
                <td className="p-3 font-medium">{s.user_email}</td>
                <td>{s.plan_name}</td>
                <td>{s.status}</td>
                <td>₦{((s.plan_price || 0) / 100).toLocaleString()}</td>
                <td>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}</td>
                <td>{new Date(s.created_at).toLocaleDateString()}</td>
                <td>{s.payment_provider || "—"}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setSelectedSub(s)} className="p-2 hover:bg-muted rounded-md">
                    <ExternalLink size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 border rounded-lg disabled:opacity-50">Prev</button>
          {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
            const page = i + 1;
            return (
              <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded-lg border ${currentPage === page ? "bg-primary text-white" : ""}`}>
                {page}
              </button>
            );
          })}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Drawer */}
      {selectedSub && (
        <div className="fixed right-0 top-0 w-96 h-full bg-background border-l p-5 shadow-xl overflow-y-auto">
          <button onClick={() => setSelectedSub(null)}><CircleX /></button>
          <h2 className="text-xl font-bold mt-4">{selectedSub.user_email}</h2>
          <p className="text-muted-foreground">Subscription ID: {selectedSub.id}</p>

          <div className="mt-4 space-y-2">
            <p>Plan: {selectedSub.plan_name}</p>
            <p>Price: ₦{((selectedSub.plan_price || 0) / 100).toLocaleString()}</p>
            <p>Status: {selectedSub.status}</p>
            <p>Current Period End: {selectedSub.current_period_end ? new Date(selectedSub.current_period_end).toLocaleDateString() : "—"}</p>

            <h3 className="mt-4 font-bold">Transactions</h3>
            <ul className="text-sm max-h-64 overflow-y-auto">
              {transactions.filter(t => t.user_id === selectedSub.user_id).map(t => (
                <li key={t.id} className="border-b py-1">
                  {t.type} - ₦{(t.amount / 100).toLocaleString()} - {t.status} ({new Date(t.created_at).toLocaleDateString()})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 border rounded-2xl bg-card shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <h2 className="text-xl font-bold mt-1">{value.toLocaleString()}</h2>
    </div>
  );
}