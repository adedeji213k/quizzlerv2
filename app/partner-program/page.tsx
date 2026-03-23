"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Sparkles, Users, Wallet, Eye, EyeOff, UserPlus } from "lucide-react";
import Link from "next/link";

export default function PartnerProgramPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
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

      const { error: ambError } = await supabase.from("ambassadors").insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
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
            {/* Logo */}
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
            Join students across schools earning money by helping others study smarter with AI.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-primary" />
              <span>Earn 30% on subscriptions & 10% on credits</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span>Grow your influence in your school</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Access private WhatsApp partner group</span>
            </div>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-[var(--shadow-elegant)] p-8">
          
          <h2 className="text-xl font-semibold mb-6 text-center">
            Join the Program
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            <label className="block text-sm font-medium mb-1">Full Name</label>
            
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

            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              name="phone"
              type="text"
              required
              placeholder="WhatsApp Number"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:ring-2 focus:ring-primary"
            />

            <label className="block text-sm font-medium mb-1">Password</label>
            {/* Password */}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            {/* Confirm Password */}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-3 rounded-lg shadow-md hover:opacity-90 transition disabled:opacity-50"
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
            Start earning immediately after joining.
          </p>
        </div>
      </div>
    </section>
  );
}