"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
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

function StatusBadge({ status }: { status: Company["status"] }) {
  const active = status === "active";
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: 8,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: active ? "#e6f4ea" : "#fff4e5",
        color: active ? "#1e7e34" : "#a15c00",
      }}
    >
      {active ? "Active" : "Pending"}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setSession(session);
      setChecked(true);
      loadCompanies(session.access_token);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/signin");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function loadCompanies(accessToken: string) {
    setLoadingCompanies(true);
    setLoadError(null);
    const res = await fetch("/api/companies", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      setLoadError(data.error ?? "Failed to load companies.");
      setCompanies([]);
      setLoadingCompanies(false);
      return;
    }

    const list: Company[] = data.companies ?? [];
    // Pending companies surface first so they're easy to find and moderate.
    list.sort((a, b) => (a.status === b.status ? 0 : a.status === "pending" ? -1 : 1));
    setCompanies(list);
    setLoadingCompanies(false);
  }

  async function activateCompany(id: string) {
    if (!session) return;
    setActivatingId(id);
    const res = await fetch(`/api/companies/${id}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status: "active" }),
    });
    setActivatingId(null);

    if (!res.ok) return;
    const data = await res.json();
    setCompanies((prev) => prev.map((c) => (c.id === id ? data.company : c)));
  }

  const pendingCount = companies.filter((c) => c.status === "pending").length;

  if (!checked) return null;

  return (
    <main style={{ maxWidth: 960, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p style={{ color: "#666" }}>
            Welcome, <strong>{session?.user.email}</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/dashboard/interviews"
            style={{
              padding: "8px 16px",
              border: "1px solid #000",
              color: "#000",
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            View Interviews
          </Link>
          <Link
            href="/dashboard/register"
            style={{
              padding: "8px 16px",
              background: "#000",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            + Register Company
          </Link>
        </div>
      </div>

      <h2 style={{ marginTop: 40 }}>
        Companies{" "}
        {!loadingCompanies && pendingCount > 0 && (
          <span style={{ fontSize: 14, fontWeight: 400, color: "#a15c00" }}>
            ({pendingCount} pending approval)
          </span>
        )}
      </h2>

      {loadError && (
        <p style={{ color: "crimson" }}>
          {loadError}
          {loadError.toLowerCase().includes("status") && (
            <>
              {" "}
              — the <code>companies.status</code> column is probably missing. Run the latest{" "}
              <code>supabase/schema.sql</code> in the Supabase SQL editor.
            </>
          )}
        </p>
      )}

      {loadingCompanies ? (
        <p style={{ color: "#888" }}>Loading…</p>
      ) : companies.length === 0 && !loadError ? (
        <p style={{ color: "#888" }}>No companies registered yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          {companies.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <Link
                href={`/dashboard/companies/${c.id}`}
                style={{ display: "block", color: "inherit", textDecoration: "none" }}
              >
                <h3 style={{ margin: 0 }}>{c.company_name}</h3>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#555" }}>{c.email}</p>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#555" }}>
                  {c.mobile_number}
                </p>
                {c.contact_address && (
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#555" }}>
                    {c.contact_address}
                  </p>
                )}
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#aaa" }}>
                  Registered {new Date(c.created_at).toLocaleDateString()}
                </p>
                <div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>

              {c.status === "pending" && (
                <button
                  onClick={() => activateCompany(c.id)}
                  disabled={activatingId === c.id}
                  style={{ marginTop: 12, padding: "6px 12px", width: "100%" }}
                >
                  {activatingId === c.id ? "Activating…" : "Activate"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
