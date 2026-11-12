"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCompanyStatus, useLinkSession } from "@/lib/useLinkSession";
import { AuthCard, Message, linkStyle } from "@/components/AuthCard";

// Where the sign-up verification email's link lands (emailRedirectTo in
// /api/company-signup). Reaching here with a session means Supabase has
// marked the email as verified.
export default function EmailConfirmedPage() {
  const { state, session, linkError } = useLinkSession();
  const [status, setStatus] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (state !== "ready" || !session) return;
    fetchCompanyStatus(session.user.id).then(async (s) => {
      setStatus(s);
      // A new company is still pending approval — don't leave a session
      // around that the dashboard would just reject.
      if (s !== "active") await supabase.auth.signOut();
    });
  }, [state, session]);

  return (
    <AuthCard title="Email verification">
      {state === "loading" && <Message kind="info">Verifying your link…</Message>}

      {state === "invalid" && (
        <>
          <Message kind="error">{linkError ?? "This verification link is invalid or has expired."}</Message>
          <p style={{ marginTop: 12, lineHeight: 1.6, fontSize: 14 }}>
            Links expire after a while and work only once. Try{" "}
            <Link href="/signin" style={linkStyle}>signing in</Link> — if your email still needs
            verifying, you can request a new link there.
          </p>
        </>
      )}

      {state === "ready" && status === undefined && <Message kind="info">Checking your account…</Message>}

      {state === "ready" && status !== undefined && (
        <>
          <Message kind="success">Your email address is verified.</Message>
          {status === "active" ? (
            <p style={{ marginTop: 12, lineHeight: 1.6 }}>
              Your account is active. <Link href="/dashboard" style={linkStyle}>Go to your dashboard →</Link>
            </p>
          ) : (
            <p style={{ marginTop: 12, lineHeight: 1.6 }}>
              An administrator now reviews new company accounts. You&apos;ll be able to{" "}
              <Link href="/signin" style={linkStyle}>sign in</Link> once yours is approved.
            </p>
          )}
        </>
      )}
    </AuthCard>
  );
}
