"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthCard, Message, inputStyle, labelStyle, linkStyle, primaryButtonStyle } from "@/components/AuthCard";

const PENDING_MSG =
  "Your company account is pending admin approval. You'll be able to sign in once it's activated.";
const NOT_COMPANY_MSG =
  "This account isn't a company account. Admins sign in through the admin app.";

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninForm />
    </Suspense>
  );
}

function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("pending") ? PENDING_MSG : searchParams.get("notcompany") ? NOT_COMPANY_MSG : null
  );
  const [unverified, setUnverified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState<string | null>(
    searchParams.get("reset") ? "Password updated — sign in with your new password." : null
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setInfo(null);
    setUnverified(false);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      setLoading(false);
      if (/not confirmed/i.test(error.message)) {
        setUnverified(true);
        setError("Please verify your email address first — check your inbox for the verification link.");
      } else if (/rate limit|too many/i.test(error.message)) {
        setError("Too many sign-in attempts. Please wait a few minutes and try again.");
      } else {
        // Same message for unknown email and wrong password.
        setError("Incorrect email or password.");
      }
      return;
    }

    // Companies start 'pending' until an admin activates them (admin/dashboard).
    // The API routes enforce this too (lib/companyAuth.ts); this check just
    // gives a clear message instead of a dashboard full of errors.
    const { data: company } = await supabase
      .from("companies")
      .select("status")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!company || company.status !== "active") {
      await supabase.auth.signOut();
      setLoading(false);
      setError(company ? PENDING_MSG : NOT_COMPANY_MSG);
      return;
    }

    router.push("/dashboard");
  }

  async function resendVerification() {
    if (cooldown > 0 || !email.trim()) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });
    setCooldown(60);
    setInfo(
      error && /rate limit|seconds/i.test(error.message)
        ? "Please wait a bit before requesting another email."
        : "If that address is waiting for verification, we've sent a new link."
    );
  }

  return (
    <AuthCard
      title="Company Sign In"
      footer={
        <>
          New here? <Link href="/signup" style={linkStyle}>Create a company account</Link>
        </>
      }
    >
      <form onSubmit={handleSignin}>
        <label style={{ ...labelStyle, marginTop: 0 }} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={inputStyle}
        />

        <label style={labelStyle} htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <div style={{ textAlign: "right", marginTop: 8, fontSize: 13 }}>
          <Link href="/forgot-password" style={linkStyle}>Forgot password?</Link>
        </div>

        {error && <Message kind="error">{error}</Message>}
        {info && <Message kind="info">{info}</Message>}

        {unverified && (
          <button
            type="button"
            onClick={resendVerification}
            disabled={cooldown > 0}
            style={{ ...primaryButtonStyle(cooldown > 0), background: "transparent", border: "1px solid #8B5CF6", color: "#c4b5fd" }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
          </button>
        )}

        <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </AuthCard>
  );
}
