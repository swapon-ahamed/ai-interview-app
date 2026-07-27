"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
    } else {
      setConfirmationSent(true);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Admin Sign Up</h1>

      {confirmationSent ? (
        <p style={{ marginTop: 16 }}>
          Check your email at <strong>{email}</strong> to confirm your account, then{" "}
          <Link href="/signin">sign in</Link>.
        </p>
      ) : (
        <form onSubmit={handleSignup}>
          <label style={{ display: "block", marginTop: 16 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{ width: "100%", padding: 8 }}
          />

          <label style={{ display: "block", marginTop: 16 }}>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />

          <label style={{ display: "block", marginTop: 16 }}>Confirm password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />

          {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ padding: "8px 16px", marginTop: 20 }}>
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>
      )}

      <p style={{ marginTop: 24, fontSize: 14 }}>
        Already have an account? <Link href="/signin">Sign in</Link>
      </p>
    </main>
  );
}
