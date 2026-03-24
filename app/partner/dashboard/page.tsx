'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Wallet, 
  MousePointerClick, 
  Copy, 
  CheckCircle2, 
  ArrowUpRight,
  Gift,
  LogOut,
  User,
  X
} from 'lucide-react';
import UserSettings from '@/app/components/partner/UserSettings';
import PaymentRequestModal from '@/app/components/PaymentTequestModal';


const PartnerDashboard = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [ambassador, setAmbassador] = useState<any>(null);
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<any[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const [pendingCommission, setPendingCommission] = useState(0); // 🔥 IMPORTANT

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/partner/login');
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.user) return router.push('/partner/login');

      const userId = session.user.id;

      // Fetch user role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData || userData.role !== 'partner') {
        await supabase.auth.signOut();
        return router.push('/partner/login');
      }

      setUser(userData);

      // Fetch ambassador
      const { data: ambassadorData } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('email', userData.email)
        .single();

      if (!ambassadorData) return;

      setAmbassador(ambassadorData);
      setReferralLink(`https://quizzler.site?ref=${ambassadorData.referral_code}`);

      // Commissions
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select('*')
        .eq('ambassador_id', ambassadorData.id);

      const totalReferrals = commissionsData?.length || 0;

      const pending = commissionsData
        ?.filter(c => !c.paid)
        .reduce((acc, c) => acc + parseFloat(c.amount_earned), 0) || 0;

      const totalPaid = commissionsData
        ?.filter(c => c.paid)
        .reduce((acc, c) => acc + parseFloat(c.amount_earned), 0) || 0;

      setPendingCommission(pending); // 🔥 store raw value

      setStats([
        { label: 'Total Referrals', value: totalReferrals, icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: 'Click-through Rate', value: ambassadorData.click_rate || '0%', icon: MousePointerClick, color: 'bg-orange-50 text-orange-600' },
        { label: 'Pending Commission', value: `₦${pending.toLocaleString()}`, icon: Wallet, color: 'bg-purple-50 text-purple-600' },
        { label: 'Total Paid Out', value: `₦${totalPaid.toLocaleString()}`, icon: Gift, color: 'bg-green-50 text-green-600' },
      ]);

      // Recent referrals
      const { data: recentCommissions } = await supabase
        .from('commissions')
        .select(`
          user_id,
          amount_earned,
          paid,
          created_at,
          type,
          users(name)
        `)
        .eq('ambassador_id', ambassadorData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentReferrals(recentCommissions || []);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  );

  return (
    <div className="p-6 bg-background min-h-screen relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Quizzler Partner Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome, {user.name}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-card text-foreground px-4 py-2 rounded-md hover:bg-card/90 transition"
          >
            <User size={16} /> Edit Profile
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-card p-3 pl-4 rounded-lg border border-border flex items-center gap-3 w-full md:w-auto mb-8">
        <span className="text-sm font-medium text-foreground truncate">
          {referralLink}
        </span>

        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md transition-colors text-sm"
        >
          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Referral Activity Table */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-foreground">Recent Referrals</h2>
            <button className="text-primary text-sm font-medium hover:underline">View All</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/10 text-muted text-xs uppercase">
                <th className="px-6 py-3 text-foreground font-medium">Customer</th>
                <th className="px-6 py-3 text-foreground font-medium">Date</th>
                <th className="px-6 py-3 text-foreground font-medium">Status</th>
                <th className="px-6 py-3 text-foreground font-medium text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/20">
              {recentReferrals.map((ref, i) => (
                <tr key={i} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{ref.users?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-foreground text-sm">{new Date(ref.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ref.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {ref.paid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-green-600 font-bold">₦{parseFloat(ref.amount_earned).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payout Card */}
        <div className="bg-gradient-to-br from-primary to-accent rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Ready for Payout?</h3>
          <p className="text-sm mb-6">Minimum ₦3,000</p>

          <div className="bg-white/10 p-4 rounded-lg mb-6">
            <p className="text-xs">Current Balance</p>
            <p className="text-3xl font-bold">
              ₦{pendingCommission.toLocaleString()}
            </p>
          </div>

          <button
            onClick={() => setShowPayoutModal(true)}
            className="w-full bg-white text-primary font-bold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            Request Payout
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-2xl w-full max-w-xl relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4">
              <X size={20} />
            </button>
            <UserSettings user={user} />
          </div>
        </div>
      )}

      {/* 🔥 Payment Modal */}
      {ambassador && (
        <PaymentRequestModal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          ambassadorId={ambassador.id}
          maxAmount={pendingCommission}
        />
      )}
    </div>
  );
};

export default PartnerDashboard;