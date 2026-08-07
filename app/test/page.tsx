"use client";

import { useState } from "react";

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("Adedeji");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const sendEmail = async () => {
    if (!email) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Welcome email sent!");
      } else {
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setMessage("Failed to send email.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Test Welcome Email</h1>

        <p className="text-muted-foreground mb-6">
          Enter an email address to receive the Quizzler welcome email.
        </p>

        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-lg border px-4 py-3 mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={sendEmail}
          disabled={loading}
          className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Welcome Email"}
        </button>

        {message && <p className="mt-4 text-sm text-center">{message}</p>}
      </div>
    </div>
  );
}
