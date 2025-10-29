"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, User, Lock, Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function UserSettings({ user }: { user: any }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });

  const updateProfile = async () => {
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });

    if (error) {
      setMessage({ text: "Failed to update profile. Please try again.", type: "error" });
    } else {
      setMessage({ text: "Profile updated successfully!", type: "success" });
    }

    setLoading(false);
  };

  const changePassword = async () => {
    const email = user?.email;
    if (!email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error)
      setMessage({ text: "Could not send reset email. Try again later.", type: "error" });
    else setMessage({ text: "Password reset email sent! Check your inbox.", type: "success" });
  };

  return (
    <div className="max-w-xl mx-auto bg-card border border-border rounded-2xl shadow-lg p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <User className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          User Settings
        </h2>
      </div>

      {/* Profile Section */}
      <section className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
          <User className="w-4 h-4 text-primary" /> Profile Information
        </h3>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Email Address
          </label>
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-muted/30">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
        </div>

        <button
          onClick={updateProfile}
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Changes"}
        </button>
      </section>

      {/* Security Section */}
      <section className="space-y-4 pt-6 border-t border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
          <Lock className="w-4 h-4 text-primary" /> Security
        </h3>

        <p className="text-sm text-muted-foreground">
          If you’d like to change your password, we’ll send you a reset link via email.
        </p>

        <button
          onClick={changePassword}
          className="w-full py-2 bg-primary/10 text-primary font-medium rounded-lg hover:bg-primary/20 transition"
        >
          Send Password Reset Email
        </button>
      </section>

      {/* Status Message */}
      {message.text && (
        <div
          className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${
            message.type === "success"
              ? "border-green-500 bg-green-500/10 text-green-600"
              : "border-destructive bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
