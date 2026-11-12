"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { passwordProblem } from "@/lib/password";

// Landing page for two kinds of emailed links:
//   - admin invites (POST /api/admins) — opening the link verifies the email
//   - password resets (/forgot-password)
// Supabase puts a short-lived session in the URL fragment; supabase-js picks
// it up automatically (detectSessionInUrl), then the user chooses a password.
export default function SetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Expired / already-used links come back as #error=...&error_description=...
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("error")) {
      setLinkError(hash.get("error_description")?.replace(/\+/g, " ") ?? "This link is invalid.");
      setState("invalid");
      return;
    }

    let settled = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !settled) {
        settled = true;
        setState("ready");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      settled = true;
      setState(session ? "ready" : "invalid");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Passwords do not match.");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const res = session
      ? await fetch("/api/me", { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null)
      : null;

    if (res?.ok) {
      router.replace("/dashboard");
    } else {
      // Not an admin (e.g. a company reset its password via this app).
      await supabase.auth.signOut();
      router.replace("/signin?reset=1");
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1>Choose a password</h1>

      {state === "loading" && <p style={{ color: "#888", marginTop: 16 }}>Checking your link…</p>}

      {state === "invalid" && (
        <>
          <p style={{ color: "crimson", marginTop: 16, lineHeight: 1.6 }}>
            {linkError ?? "This link is invalid or has expired."}
          </p>
          <p style={{ marginTop: 12, lineHeight: 1.6 }}>
            If you were resetting your password, <Link href="/forgot-password">request a new link</Link>.
            If this was an admin invite, ask the admin who invited you to send a new one.
          </p>
        </>
      )}

      {state === "ready" && (
        <form onSubmit={handleSubmit}>
          <p style={{ color: "#1e7e34", marginTop: 12 }}>Your email is verified.</p>
          <label style={{ display: "block", marginTop: 16 }}>New password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />
          <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            At least 8 characters, including a letter and a number.
          </p>

          <label style={{ display: "block", marginTop: 16 }}>Confirm password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />

          {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

          <button type="submit" disabled={saving} style={{ padding: "8px 16px", marginTop: 20 }}>
            {saving ? "Saving…" : "Save password"}
          </button>
        </form>
      )}
    </main>
  );
}
