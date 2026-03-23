"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  User,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from "lucide-react";

export default function UserSettings({ user }: { user: any }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");

  // 🔥 Bank states
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetchingBank, setFetchingBank] = useState(false);

  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "";
  }>({
    text: "",
    type: "",
  });

  // ✅ FETCH EXISTING BANK DETAILS
  useEffect(() => {
    const fetchBankDetails = async () => {
      if (user?.role !== "partner") return;

      setFetchingBank(true);

      const { data, error } = await supabase
        .from("ambassadors")
        .select("bank_name, account_number, account_name")
        .eq("email", user.email)
        .single();

      if (!error && data) {
        setBankName(data.bank_name || "");
        setAccountNumber(data.account_number || "");
        setAccountName(data.account_name || "");
      }

      setFetchingBank(false);
    };

    fetchBankDetails();
  }, [user]);

  const updateProfile = async () => {
    setLoading(true);
    setMessage({ text: "", type: "" });

    // ✅ Update name
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });

    let bankError = null;

    if (user?.role === "partner") {
      // 🔥 UPSERT (update if exists, insert if not)
      const { error } = await supabase.from("ambassadors").upsert(
        {
          email: user.email,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
        },
        { onConflict: "email" }
      );

      bankError = error;
    }

    if (authError || bankError) {
      setMessage({
        text: "Failed to update settings. Please try again.",
        type: "error",
      });
    } else {
      setMessage({
        text: "Settings updated successfully!",
        type: "success",
      });
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
      setMessage({
        text: "Could not send reset email. Try again later.",
        type: "error",
      });
    else
      setMessage({
        text: "Password reset email sent! Check your inbox.",
        type: "success",
      });
  };

  return (
    <div className="max-w-xl mx-auto bg-card border border-border rounded-2xl shadow-lg p-8 space-y-8 max-h-[80vh] overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <User className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          User Settings
        </h2>
      </div>

      {/* Profile */}
      <section className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <User className="w-4 h-4 text-primary" /> Profile Information
        </h3>
        <label className="block text-sm mb-1">Full Name</label>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          placeholder="Full Name"
        />

        <label className="block text-sm mb-1">Email</label>

        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-muted/30">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{user?.email}</span>
        </div>
      </section>

      {/* 🔥 Bank Details */}
      {user?.role === "partner" && (
        <section className="space-y-4 pt-6 border-t border-border">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <CreditCard className="w-4 h-4 text-primary" /> Bank Details
          </h3>

          {fetchingBank ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading bank details...
            </div>
          ) : (
            <>
            <label className="block text-sm mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="Bank Name"
              />
              <label className="block text-sm mb-1">Account Number</label>

              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="Account Number"
              />

              <label className="block text-sm mb-1">Account Name</label>

              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="Account Name"
              />
            </>
          )}
        </section>
      )}

      {/* Save */}
      <button
        onClick={updateProfile}
        disabled={loading}
        className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-primary to-accent text-white py-2 rounded-lg"
      >
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Changes"}
      </button>

      {/* Security */}
      <section className="space-y-4 pt-6 border-t border-border">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <Lock className="w-4 h-4 text-primary" /> Security
        </h3>

        <button
          onClick={changePassword}
          className="w-full py-2 bg-primary/10 text-primary rounded-lg"
        >
          Send Password Reset Email
        </button>
      </section>

      {/* Message */}
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