"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthCard, Message, inputStyle, labelStyle, linkStyle, primaryButtonStyle } from "@/components/AuthCard";

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

    // Only rate limiting is surfaced; everything else shows "sent" so this
    // page can't be used to check which emails have accounts.
    if (error && /rate limit|too many|seconds/i.test(error.message)) {
      setError("Too many requests. Please wait a few minutes and try again.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Reset your password"
      footer={<Link href="/signin" style={linkStyle}>Back to sign in</Link>}
    >
      {sent ? (
        <p style={{ lineHeight: 1.6 }}>
          If an account exists for <strong>{email.trim()}</strong>, we&apos;ve emailed a link to
          reset its password. The link expires after a short time.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={{ ...labelStyle, marginTop: 0 }} htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          {error && <Message kind="error">{error}</Message>}
          <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
