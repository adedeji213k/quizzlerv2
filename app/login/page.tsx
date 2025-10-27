"use client";

import { useState, useEffect } from "react";
import { Sparkles, Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ✅ If the user is already logged in, redirect them
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.push("/dashboard");
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data.session) {
      // ✅ Supabase automatically persists session in localStorage
      alert("Login successful!");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background px-6">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Quizzler
        </span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-[var(--shadow-elegant)] p-8 border border-border">
        <h1 className="text-2xl font-semibold text-center mb-2">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Sign in to generate quizzes effortlessly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
              placeholder="you@example.com"
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-3 rounded-lg shadow-[var(--shadow-glow)] hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Signing In..." : <><LogIn className="w-5 h-5" />Sign In</>}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Don’t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
          <p className="mt-2">
            <Link href="/forgot-password" className="hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>

      {/* Background Glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_70%)]"></div>
    </div>
  );
}
