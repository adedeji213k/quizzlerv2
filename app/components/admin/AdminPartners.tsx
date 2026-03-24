'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ExternalLink, CircleX } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  total_earnings: number;
  created_at: string;

  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;

  pending_payouts: number;
  total_referrals: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

const PER_PAGE = 20;

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filtered, setFiltered] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<Partner | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    pendingPayouts: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    filterPartners();
    setCurrentPage(1);
  }, [search, partners]);

  const fetchPartners = async () => {
    setLoading(true);

    try {
      const { data: ambassadors } = await supabase
        .from("ambassadors")
        .select("*");

      const { data: commissions } = await supabase
        .from("commissions")
        .select("*");

      const { data: payouts } = await supabase
        .from("payout_requests")
        .select("*");

      // --- maps ---
      const commissionMap: Record<string, any[]> = {};
      commissions?.forEach(c => {
        if (!commissionMap[c.ambassador_id]) {
          commissionMap[c.ambassador_id] = [];
        }
        commissionMap[c.ambassador_id].push(c);
      });

      const payoutMap: Record<string, any[]> = {};
      payouts?.forEach(p => {
        if (!payoutMap[p.ambassador_id]) {
          payoutMap[p.ambassador_id] = [];
        }
        payoutMap[p.ambassador_id].push(p);
      });

      const enriched: Partner[] = ambassadors?.map(a => {
        const partnerCommissions = commissionMap[a.id] || [];
        const partnerPayouts = payoutMap[a.id] || [];

        return {
          id: a.id,
          name: a.name,
          email: a.email,
          referral_code: a.referral_code,
          total_earnings: a.total_earnings,

          created_at: a.created_at,

          bank_name: a.bank_name,
          account_number: a.account_number,
          account_name: a.account_name,

          pending_payouts: partnerPayouts.filter(p => p.status === "pending").length,
          total_referrals: partnerCommissions.length
        };
      }) || [];

      setPartners(enriched);

      setStats({
        total: enriched.length,
        pendingPayouts: payouts?.filter(p => p.status === "pending").length || 0,
        totalEarnings: enriched.reduce((acc, p) => acc + (p.total_earnings || 0), 0)
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterPartners = () => {
    let data = [...partners];

    if (search) {
      data = data.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.referral_code?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(data);
  };

  // PAGINATION
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  // FETCH PAYOUTS FOR DRAWER
  const openPartner = async (partner: Partner) => {
    setSelected(partner);

    const { data } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("ambassador_id", partner.id)
      .order("created_at", { ascending: false });

    setPayouts(data || []);
  };

  if (loading) return <p className="animate-pulse">Loading partners...</p>;

  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">Partners</h1>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Partners" value={stats.total} />
        <StatCard label="Pending Payouts" value={stats.pendingPayouts} />
        <StatCard label="Total Earnings" value={stats.totalEarnings} />
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search name, email, referral code..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="px-3 py-2 border rounded-xl bg-background"
      />

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-2xl bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th>Email</th>
              <th>Referral</th>
              <th>Earnings</th>
              <th>Pending Payouts</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {paginated.map(p => (
              <tr key={p.id} className="border-b hover:bg-muted/40">
                <td className="p-3 font-medium">{p.name}</td>
                <td>{p.email}</td>
                <td>{p.referral_code}</td>
                <td>₦{p.total_earnings}</td>
                <td>{p.pending_payouts}</td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>

                <td className="text-right p-3">
                  <button onClick={() => openPartner(p)}>
                    <ExternalLink size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between">
        <p>Page {currentPage} of {totalPages}</p>

        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            Prev
          </button>

          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            Next
          </button>
        </div>
      </div>

      {/* DRAWER */}
      {selected && (
        <div className="fixed right-0 top-0 w-96 h-full bg-background border-l p-5 shadow-xl overflow-y-auto">
          <button onClick={() => setSelected(null)}>
            <CircleX />
          </button>

          <h2 className="text-xl font-bold mt-4">{selected.name}</h2>
          <p className="text-muted-foreground">{selected.email}</p>

          {/* BANK DETAILS */}
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">Bank Details</h3>
            <p>Bank: {selected.bank_name || "—"}</p>
            <p>Account Name: {selected.account_name || "—"}</p>
            <p>Account Number: {selected.account_number || "—"}</p>
          </div>

          {/* PAYOUT REQUESTS */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Payout Requests</h3>

            {payouts.length === 0 && <p>No requests</p>}

            {payouts.map(p => (
              <div key={p.id} className="border p-3 rounded-xl mb-2">
                <p>₦{p.amount}</p>
                <p className="text-sm text-muted-foreground">{p.status}</p>
                <p className="text-xs">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 border rounded-2xl bg-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <h2 className="text-xl font-bold mt-1">{value}</h2>
    </div>
  );
}