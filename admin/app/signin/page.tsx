"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";

const DENIED_MSG =
  "This account doesn't have admin access. Admin accounts are invite-only — ask an existing admin to invite you.";

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
    searchParams.get("denied") ? DENIED_MSG : null
  );
  const notice = searchParams.get("reset") ? "Password updated — sign in with your new password." : null;

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      setLoading(false);
      setError(
        /not confirmed/i.test(error?.message ?? "")
          ? "This email hasn't been verified yet. Open the invite email we sent you to finish setting up your account."
          : // Same message for unknown email and wrong password (no account enumeration).
            "Incorrect email or password."
      );
      return;
    }

    // Being able to sign in isn't enough — company accounts share this
    // Supabase project. Confirm the account is an admin before entering.
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    }).catch(() => null);

    if (!res?.ok) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(res?.status === 403 ? DENIED_MSG : "Couldn't verify admin access. Please try again.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1>Admin Sign In</h1>

      {notice && <p style={{ color: "#1e7e34", marginTop: 12 }}>{notice}</p>}

      <form onSubmit={handleSignin}>
        <label style={{ display: "block", marginTop: 16 }}>Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
        />

        <label style={{ display: "block", marginTop: 16 }}>Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
        />

        {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: "8px 16px", marginTop: 20 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 14 }}>
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
      <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
        Admin accounts are invite-only. Ask an existing admin to invite you.
      </p>
    </main>
  );
}
