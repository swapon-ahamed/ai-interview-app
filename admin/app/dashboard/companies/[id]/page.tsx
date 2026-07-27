"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  company_name: string;
  email: string;
  mobile_number: string;
  contact_address: string | null;
  status: "pending" | "active";
  created_at: string;
};

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setAccessToken(session.access_token);

      const res = await fetch(`/api/companies/${params.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        setError(res.status === 404 ? "Company not found." : "Failed to load company.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const c: Company = data.company;
      setCompany(c);
      setCompanyName(c.company_name);
      setMobileNumber(c.mobile_number);
      setContactAddress(c.contact_address ?? "");
      setLoading(false);
    });
  }, [router, params.id]);

  async function handleSave(e: React.FormEvent) {
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

    setSaving(true);
    const res = await fetch(`/api/companies/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        companyName,
        mobileNumber,
        contactAddress,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save changes.");
      return;
    }

    setSaved(true);
  }

  async function handleStatusChange(nextStatus: Company["status"]) {
    setStatusError(null);
    setUpdatingStatus(true);
    const res = await fetch(`/api/companies/${params.id}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    setUpdatingStatus(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatusError(data.error ?? "Failed to update status.");
      return;
    }

    const data = await res.json();
    setCompany(data.company);
  }

  if (loading) return null;

  if (error && !company) {
    return (
      <main style={{ maxWidth: 400, margin: "60px auto", fontFamily: "sans-serif" }}>
        <p>{error}</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  const isActive = company?.status === "active";

  return (
    <main style={{ maxWidth: 400, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>Edit Company</h1>

      <section
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong>Status:</strong>{" "}
          <span style={{ color: isActive ? "#1e7e34" : "#a15c00" }}>
            {isActive ? "Active" : "Pending approval"}
          </span>
        </div>
        <button
          type="button"
          disabled={updatingStatus}
          onClick={() => handleStatusChange(isActive ? "pending" : "active")}
          style={{ padding: "8px 16px" }}
        >
          {updatingStatus
            ? "Updating…"
            : isActive
            ? "Revert to Pending"
            : "Activate Company"}
        </button>
      </section>
      {statusError && <p style={{ color: "crimson", marginTop: 8 }}>{statusError}</p>}

      <form onSubmit={handleSave}>
        <label style={{ display: "block", marginTop: 16 }}>Company name *</label>
        <input
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />

        <label style={{ display: "block", marginTop: 16 }}>Mobile number *</label>
        <input
          type="tel"
          required
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />

        <label style={{ display: "block", marginTop: 16 }}>Contact address</label>
        <input
          value={contactAddress}
          onChange={(e) => setContactAddress(e.target.value)}
          placeholder="Optional"
          style={{ width: "100%", padding: 8 }}
        />

        <label style={{ display: "block", marginTop: 16 }}>Email</label>
        <input
          disabled
          value={company?.email ?? ""}
          style={{ width: "100%", padding: 8, background: "#f2f2f2", color: "#888" }}
        />
        <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          Email is the company's sign-in username and can't be changed here.
        </p>

        {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
        {saved && <p style={{ color: "green", marginTop: 12 }}>Saved.</p>}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="submit" disabled={saving} style={{ padding: "8px 16px" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/dashboard" style={{ alignSelf: "center" }}>
            Back to dashboard
          </Link>
        </div>
      </form>
    </main>
  );
}
