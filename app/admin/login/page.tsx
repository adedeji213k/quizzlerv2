'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ Sign in user
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

      if (signInError) throw signInError;
      if (!signInData.user) throw new Error("Login failed");

      // 2️⃣ Fetch user role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", signInData.user.id)
        .single();

      if (userError) throw userError;

      // 3️⃣ Check admin role
      if (!userData || userData.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("You are not authorized as an admin.");
      }

      // 4️⃣ Redirect to admin dashboard
      router.push("/admin/dashboard");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background px-6">
      
      {/* Logo */}
      <Link href="/">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Quizzler
          </span>
        </div>
      </Link>

      {/* Header */}
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Admin Login
      </h1>

      {/* Login Form */}
      <div className="w-full max-w-md bg-card rounded-2xl shadow-[var(--shadow-elegant)] p-8 border border-border backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="admin@quizzler.com"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background/60 focus:outline-none focus:ring-2 focus:ring-primary transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-3 rounded-lg shadow-md hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : (
              <>
                <LogIn className="w-5 h-5" /> Login as Admin
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground text-center">
          This area is restricted to authorized administrators only.
        </p>
      </div>
    </div>
  );
}