"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { passwordProblem } from "@/lib/password";
import { fetchCompanyStatus, useLinkSession } from "@/lib/useLinkSession";
import { AuthCard, Message, inputStyle, labelStyle, linkStyle, primaryButtonStyle } from "@/components/AuthCard";

// Landing page for:
//   - company invites sent by an admin (admin/app/api/register-company) —
//     opening the link verifies the email; the company picks its password here
//   - password-reset links (/forgot-password)
export default function SetPasswordPage() {
  const router = useRouter();
  const { state, linkError } = useLinkSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Passwords do not match.");

    setSaving(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) {
      setSaving(false);
      setError(error?.message ?? "Couldn't save your password.");
      return;
    }

    const status = await fetchCompanyStatus(data.user.id);
    if (status === "active") {
      router.replace("/dashboard");
      return;
    }
    await supabase.auth.signOut();
    if (status === null) {
      router.replace("/signin?reset=1");
      return;
    }
    setSaving(false);
    setPendingApproval(true);
  }

  if (pendingApproval) {
    return (
      <AuthCard title="Password saved">
        <Message kind="success">Your email is verified and your password is set.</Message>
        <p style={{ marginTop: 12, lineHeight: 1.6 }}>
          Your company account is awaiting admin approval. You&apos;ll be able to{" "}
          <Link href="/signin" style={linkStyle}>sign in</Link> once it&apos;s activated.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a password">
      {state === "loading" && <Message kind="info">Checking your link…</Message>}

      {state === "invalid" && (
        <>
          <Message kind="error">{linkError ?? "This link is invalid or has expired."}</Message>
          <p style={{ marginTop: 12, lineHeight: 1.6, fontSize: 14 }}>
            Resetting your password? <Link href="/forgot-password" style={linkStyle}>Request a new link</Link>.
            Invited by an administrator? Ask them to send a new invite.
          </p>
        </>
      )}

      {state === "ready" && (
        <form onSubmit={handleSubmit}>
          <Message kind="success">Your email is verified.</Message>
          <label style={labelStyle} htmlFor="password">New password</label>
          <input id="password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          <p style={{ fontSize: 12, color: "#9a9aa8", marginTop: 4 }}>At least 8 characters, including a letter and a number.</p>

          <label style={labelStyle} htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />

          {error && <Message kind="error">{error}</Message>}

          <button type="submit" disabled={saving} style={primaryButtonStyle(saving)}>
            {saving ? "Saving…" : "Save password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
