"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Users,
  Wallet,
  Eye,
  EyeOff,
  UserPlus,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function PartnerProgramPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateReferralCode = (name: string) => {
    const base = name.split(" ")[0].toLowerCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${base}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from("ambassadors")
        .select("*")
        .eq("email", form.email)
        .single();

      if (existing) {
        throw new Error("You are already a partner.");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      const referral_code = generateReferralCode(form.name);

      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        name: form.name,
        email: form.email,
        role: "partner",
      });

      if (userError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error("Failed to register user. Registration rolled back.");
      }

      // ✅ Give partner PRO subscription
const PRO_PLAN_ID = "YOUR_PRO_PLAN_ID"; // replace this

const { error: subError } = await supabase.from("subscriptions").insert({
  user_id: authData.user.id,
  plan_id: PRO_PLAN_ID,
  status: "active",
});

if (subError) {
  await supabase.auth.admin.deleteUser(authData.user.id);
  await supabase.from("users").delete().eq("id", authData.user.id);
  throw new Error("Failed to assign Pro subscription.");
}

      const { error: ambError } = await supabase.from("ambassadors").insert({
  name: form.name,
  email: form.email,
  phone: form.phone,
  school: form.school, // ✅ ADD THIS
  referral_code,
});

      if (ambError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from("users").delete().eq("id", authData.user.id);
        throw new Error("Failed to register as partner. Registration rolled back.");
      }

      alert(
        `🎉 You're in!\n\nYour referral code: ${referral_code}\n\nStart sharing: quizzler.app?ref=${referral_code}`
      );

      router.push("/partner/login");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[image:var(--gradient-subtle)]" />
      <div className="absolute top-10 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-10 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "0.8s" }}
      />

      <div className="relative z-10 max-w-6xl w-full grid md:grid-cols-2 gap-12 ">
        {/* LEFT */}
        <div className="space-y-6 text-center md:text-left">
          <Link href="/">
            <div className="mb-8 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Quizzler
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Partner Program
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Earn Money Promoting{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quizzler
            </span>
          </h1>

          <p className="text-lg text-muted-foreground">
            Turn your influence into income. Share Quizzler with students and
            earn every time they subscribe or buy credits.
          </p>

          {/* HOW IT WORKS */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>Share your unique referral link</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>They subscribe or buy credits</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>You earn real money every week</span>
            </div>
          </div>

          {/* EARNINGS */}
          <div className="bg-card/60 border border-border rounded-xl p-5 mt-6 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <TrendingUp className="w-5 h-5 text-primary" />
              Earnings Example
            </div>

            <p className="text-sm text-muted-foreground">
              • Refer 10 paying students → ₦4,500 – ₦12,000/month  
            </p>
            <p className="text-sm text-muted-foreground"> 
              • Refer 30 students → ₦13,500 – ₦36,000/month  
            </p>
            <p className="text-sm text-muted-foreground">
              • Refer 100+ students → ₦45,000+/month
            </p>

            <p className="text-xs text-muted-foreground">
              *You earn when users subscribe or purchase credits — not just sign
              up.*
            </p>
          </div>

          {/* PERKS */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-primary" />
              <span>30% commission on subscriptions</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span>10% on credit purchases</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Free Pro account + private WhatsApp group</span>
            </div>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-[var(--shadow-elegant)] p-8">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Join the Program
          </h2>

<label className="block text-sm font-medium mb-1">Full Name</label>
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              name="name"
              type="text"
              required
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
            />
<label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
            />

<label className="block text-sm font-medium mb-1">WhatsApp Number</label>
            <input
              name="phone"
              type="text"
              required
              placeholder="WhatsApp Number"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
            />

            <label className="block text-sm font-medium mb-1">School / University</label>
<input
  name="school"
  type="text"
  required
  placeholder="e.g. University of Lagos"
  value={form.school}
  onChange={handleChange}
  className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
/>

<label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

<label className="block text-sm font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Joining..." : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Join Now
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Get your referral link instantly after joining.
          </p>
        </div>
      </div>
    </section>
  );
}