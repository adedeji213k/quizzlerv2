'use client';

import { useState } from "react";
import { Sparkles, Eye, EyeOff, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      // 2️⃣ Get referral code from localStorage
      const referralCode = localStorage.getItem("referral_code");
      let validReferral: string | null = null;

      if (referralCode) {
        // Validate referral code exists in ambassadors table
        const { data: ambassador, error: refError } = await supabase
          .from("ambassadors")
          .select("referral_code")
          .eq("referral_code", referralCode)
          .single();

        if (!refError && ambassador) {
          validReferral = referralCode;
        }
      }

      // 3️⃣ Insert user into `users` table
      const { error: insertError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: authData.user.email,
        name: form.name,
        role: "free",
        referred_by: validReferral, // ✅ referral saved here
      });

      if (insertError) {
        // ❌ Rollback: delete auth user if DB insert fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error("Failed to register user in database. Registration rolled back.");
      }

      // 4️⃣ Clear referral after use
      if (referralCode) {
        localStorage.removeItem("referral_code");
      }

      alert(
        "Registration successful! Please check your email for a verification link before logging in."
      );

      router.push("/login");

    } catch (err: any) {
      console.error("Registration error:", err);
      alert(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background px-6">
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

      {/* Register Card */}
      <div className="w-full max-w-md bg-card rounded-2xl shadow-[var(--shadow-elegant)] p-8 border border-border backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Create your account
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Join Quizzler and start creating AI-powered quizzes instantly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              className="w-full px-4 py-3 rounded-lg border bg-background/60 focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border bg-background/60 focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border bg-background/60 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border bg-background/60 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3"
              >
                {showConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg"
          >
            {loading ? "Creating Account..." : <>
              <UserPlus className="w-5 h-5" /> Create Account
            </>}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}