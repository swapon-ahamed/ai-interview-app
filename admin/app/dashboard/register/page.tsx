"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setAccessToken(session.access_token);
      setChecked(true);
    });
  }, [router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!mobileNumber.trim()) {
      setError("Mobile number is required.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register-company", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email,
        companyName,
        mobileNumber,
        contactAddress,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to register company.");
      return;
    }

    setDone(true);
  }

  if (!checked) return null;

  return (
    <main style={{ maxWidth: 400, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>Register Company</h1>

      {done ? (
        <p style={{ marginTop: 16 }}>
          <strong>{companyName}</strong> has been registered with status{" "}
          <strong>Pending</strong>, and an invite was emailed to <strong>{email}</strong>. They
          verify their email and choose their own password from that link. You can activate
          them from <Link href="/dashboard">the dashboard</Link> once they&apos;ve accepted.
        </p>
      ) : (
        <form onSubmit={handleRegister}>
          <label style={{ display: "block", marginTop: 16 }}>Company name *</label>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Inc."
            style={{ width: "100%", padding: 8 }}
          />

          <label style={{ display: "block", marginTop: 16 }}>Mobile number *</label>
          <input
            type="tel"
            required
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="e.g. +1 555 123 4567"
            style={{ width: "100%", padding: 8 }}
          />

          <label style={{ display: "block", marginTop: 16 }}>Contact address</label>
          <input
            value={contactAddress}
            onChange={(e) => setContactAddress(e.target.value)}
            placeholder="Optional"
            style={{ width: "100%", padding: 8 }}
          />

          <label style={{ display: "block", marginTop: 16 }}>Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@company.com"
            style={{ width: "100%", padding: 8 }}
          />

          <p style={{ fontSize: 13, color: "#666", marginTop: 12, lineHeight: 1.5 }}>
            We&apos;ll email an invite link to this address. The company verifies its email and
            sets its own password from that link — you don&apos;t choose it for them.
          </p>

          {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button type="submit" disabled={loading} style={{ padding: "8px 16px" }}>
              {loading ? "Sending invite…" : "Register & send invite"}
            </button>
            <Link href="/dashboard" style={{ alignSelf: "center" }}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}
