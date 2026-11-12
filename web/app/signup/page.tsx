"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { passwordProblem } from "@/lib/password";
import {
  AuthCard,
  Message,
  inputStyle,
  labelStyle,
  linkStyle,
  primaryButtonStyle,
} from "@/components/AuthCard";

const RESEND_COOLDOWN_S = 60;

// Public company sign-up. Flow: submit -> verification email -> click link
// (/auth/confirmed) -> admin approves -> company can sign in.
export default function SignupPage() {
  const [form, setForm] = useState({
    companyName: "",
    mobileNumber: "",
    contactAddress: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setError(null);

    const pw = passwordProblem(form.password);
    if (pw) return setError(pw);
    if (form.password !== form.confirm) return setError("Passwords do not match.");

    inFlight.current = true;
    setLoading(true);
    const res = await fetch("/api/company-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: form.companyName,
        mobileNumber: form.mobileNumber,
        contactAddress: form.contactAddress,
        email: form.email,
        password: form.password,
        website,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    inFlight.current = false;
    setLoading(false);

    if (!res || !res.ok) {
      setError(data?.error ?? "Network error — please try again.");
      return;
    }
    setSentTo(form.email.trim().toLowerCase());
    setCooldown(RESEND_COOLDOWN_S);
  }

  async function resend() {
    if (!sentTo || cooldown > 0) return;
    setResendMsg(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmed` },
    });
    setCooldown(RESEND_COOLDOWN_S);
    setResendMsg(
      error && /rate limit|seconds/i.test(error.message)
        ? "Please wait a bit before requesting another email."
        : "If that address is waiting for verification, we've sent a new link."
    );
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Check your email"
        footer={
          <>
            Already verified? <Link href="/signin" style={linkStyle}>Sign in</Link>
          </>
        }
      >
        <p style={{ lineHeight: 1.6 }}>
          We sent a verification link to <strong>{sentTo}</strong>. Open it to confirm your email
          address.
        </p>
        <p style={{ lineHeight: 1.6, marginTop: 12, color: "#9a9aa8", fontSize: 14 }}>
          After you verify, an administrator reviews and approves new company accounts. You can
          sign in once your account is approved.
        </p>
        <button onClick={resend} disabled={cooldown > 0} style={primaryButtonStyle(cooldown > 0)}>
          {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend verification email"}
        </button>
        {resendMsg && <Message kind="info">{resendMsg}</Message>}
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create a company account"
      footer={
        <>
          Already have an account? <Link href="/signin" style={linkStyle}>Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSignup}>
        <label style={{ ...labelStyle, marginTop: 0 }} htmlFor="companyName">Company name *</label>
        <input id="companyName" required maxLength={200} autoComplete="organization" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} style={inputStyle} />

        <label style={labelStyle} htmlFor="mobile">Mobile number *</label>
        <input id="mobile" type="tel" required maxLength={30} autoComplete="tel" placeholder="+8801712345678" value={form.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} style={inputStyle} />

        <label style={labelStyle} htmlFor="address">Contact address</label>
        <input id="address" maxLength={500} autoComplete="street-address" placeholder="Optional" value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} style={inputStyle} />

        <label style={labelStyle} htmlFor="email">Work email *</label>
        <input id="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} style={inputStyle} />

        <label style={labelStyle} htmlFor="password">Password *</label>
        <input id="password" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} style={inputStyle} />
        <p style={{ fontSize: 12, color: "#9a9aa8", marginTop: 4 }}>At least 8 characters, including a letter and a number.</p>

        <label style={labelStyle} htmlFor="confirm">Confirm password *</label>
        <input id="confirm" type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} style={inputStyle} />

        {/* Honeypot: off-screen, unfocusable. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: -10000, width: 1, height: 1, opacity: 0 }}
        />

        {error && <Message kind="error">{error}</Message>}

        <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
