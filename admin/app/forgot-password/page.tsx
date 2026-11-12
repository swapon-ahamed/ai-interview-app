"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/set-password`,
    });
    setLoading(false);

    // Supabase rate-limits these; anything else is shown as "sent" so the
    // page can't be used to discover which emails have accounts.
    if (error && /rate limit|too many/i.test(error.message)) {
      setError("Too many requests. Please wait a few minutes and try again.");
      return;
    }
    setSent(true);
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1>Reset your password</h1>

      {sent ? (
        <p style={{ marginTop: 16, lineHeight: 1.6 }}>
          If an account exists for <strong>{email.trim()}</strong>, we&apos;ve emailed a link to
          reset its password. The link expires after a short time.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginTop: 16 }}>Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />
          {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: "8px 16px", marginTop: 20 }}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p style={{ marginTop: 24, fontSize: 14 }}>
        <Link href="/signin">Back to sign in</Link>
      </p>
    </main>
  );
}
