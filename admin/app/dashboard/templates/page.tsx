"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Template = {
  id: string;
  role: string;
  slug: string;
  skills: string[];
  duration_minutes: number;
  questions: string[];
};

export default function TemplatesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setSession(session);
      loadTemplates(session.access_token);
    });
  }, [router]);

  async function loadTemplates(accessToken: string) {
    setLoading(true);
    setLoadError(null);
    const res = await fetch("/api/templates", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      setLoadError(data.error ?? "Failed to load templates.");
      setLoading(false);
      return;
    }
    setTemplates(data.templates ?? []);
    setLoading(false);
  }

  async function deleteTemplate(id: string, role: string) {
    if (!session) return;
    if (!confirm(`Remove "${role}" from the catalog? This can't be undone.`)) return;

    setDeletingId(id);
    const res = await fetch(`/api/templates/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setDeletingId(null);

    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Practice Templates</h1>
          <p style={{ color: "#666" }}>
            Roles shown on the company create-interview picker and on the public,
            no-signup <code>/practice</code> catalog.
          </p>
        </div>
        <Link
          href="/dashboard/templates/new"
          style={{
            padding: "8px 16px",
            background: "#000",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          + New Template
        </Link>
      </div>

      {loadError && <p style={{ color: "crimson", marginTop: 24 }}>{loadError}</p>}

      {loading ? (
        <p style={{ color: "#888", marginTop: 24 }}>Loading…</p>
      ) : templates.length === 0 && !loadError ? (
        <p style={{ color: "#888", marginTop: 24 }}>No templates yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          {templates.map((t) => (
            <div key={t.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
              <Link
                href={`/dashboard/templates/${t.id}`}
                style={{ display: "block", color: "inherit", textDecoration: "none" }}
              >
                <h3 style={{ margin: 0 }}>{t.role}</h3>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#888" }}>
                  ~{t.duration_minutes} min · {t.questions.length} plan steps
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {(t.skills ?? []).map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 12,
                        color: "#4338CA",
                        background: "#EDE9FE",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </Link>
              <button
                onClick={() => deleteTemplate(t.id, t.role)}
                disabled={deletingId === t.id}
                style={{
                  marginTop: 12,
                  padding: "6px 12px",
                  width: "100%",
                  color: "#a11",
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {deletingId === t.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
