"use client";

import { useState, useEffect } from "react";
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
  // ✅ 1. Mode State (core of everything)
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  // ✅ 2. Detect Logged-in User (auto-fill)
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);

        // get extra data from your users table
        const { data: userData } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", user.id)
          .single();

        setForm((prev) => ({
          ...prev,
          name: userData?.name || "",
          email: user.email || "",
        }));
      }
    };

    checkUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateReferralCode = (name: string) => {
    const base = name ? name.split(" ")[0].toLowerCase() : "user";
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${base}${random}`;
  };

  // ✅ 5. 🔥 REWRITE handleSubmit (3 FLOWS)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let user = null;
      let name = form.name;

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // =========================
      // 🟢 EXISTING USER FLOW
      // =========================
      if (mode === "existing") {
        if (currentUser) {
          user = currentUser;

          // get name from DB
          const { data } = await supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .single();

          name = data?.name || name;
        } else {
          // login
          const { data: loginData, error } =
            await supabase.auth.signInWithPassword({
              email: form.email,
              password: form.password,
            });

          if (error) throw new Error("Invalid login details");

          user = loginData.user;

          const { data } = await supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .single();

          name = data?.name || name;
        }
      }

      // =========================
      // 🔵 NEW USER FLOW
      // =========================
      if (mode === "new") {
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { name: form.name },
          },
        });

        if (error) throw error;
        if (!authData.user) throw new Error("Signup failed");

        user = authData.user;
      }

      if (!user) throw new Error("Something went wrong");

      // =========================
      // 🚫 CHECK IF ALREADY PARTNER
      // =========================
      const { data: existing } = await supabase
        .from("ambassadors")
        .select("*")
        .eq("email", user.email)
        .single();

      if (existing) {
        throw new Error("You are already a partner.");
      }

      const referral_code = generateReferralCode(name);

      // =========================
      // 👤 UPSERT USER (CRITICAL)
      // =========================
      await supabase.from("users").upsert({
        id: user.id,
        name,
        email: user.email,
        role: "partner",
      });

      // =========================
      // 💎 GIVE PRO
      // =========================
      const PRO_PLAN_ID = "YOUR_PRO_PLAN_ID";

      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan_id: PRO_PLAN_ID,
        status: "active",
      });

      // =========================
      // 🤝 CREATE AMBASSADOR
      // =========================
      await supabase.from("ambassadors").insert({
        name,
        email: user.email,
        phone: form.phone,
        school: form.school,
        referral_code,
      });

      alert(
        `🎉 You're in!\n\nYour referral code: ${referral_code}\n\nStart sharing: quizzler.app?ref=${referral_code}`,
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

          {/* ✅ 3. ADD: Toggle UI (VERY IMPORTANT) */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex-1 py-2 rounded-lg border transition-colors ${
                mode === "new" ? "bg-primary text-white" : "bg-transparent"
              }`}
            >
              New User
            </button>

            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 py-2 rounded-lg border transition-colors ${
                mode === "existing" ? "bg-primary text-white" : "bg-transparent"
              }`}
            >
              Existing User
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ✅ 4. UPDATE FORM FIELDS (Conditional Inputs) */}

            {/* 🔹 Name field (Only New Users) */}
            {mode === "new" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* 🔹 Email field (Not Logged In OR New User) */}
            {(!isLoggedIn || mode === "new") && (
              <div>
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
              </div>
            )}

            {/* Always show Phone and School based on your base code */}
            <div>
              <label className="block text-sm font-medium mb-1">
                WhatsApp Number
              </label>
              <input
                name="phone"
                type="text"
                required
                placeholder="WhatsApp Number"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                School / University
              </label>
              <input
                name="school"
                type="text"
                required
                placeholder="e.g. University of Lagos"
                value={form.school}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 🔹 Password field (New User OR Existing & Not Logged In) */}
            {(mode === "new" || (mode === "existing" && !isLoggedIn)) && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* 🔹 Confirm Password (ONLY NEW USERS) */}
            {mode === "new" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Confirm Password
                </label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 mt-2"
            >
              {loading ? (
                "Joining..."
              ) : (
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
