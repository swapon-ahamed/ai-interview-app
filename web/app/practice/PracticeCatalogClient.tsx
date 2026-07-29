"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/Logo";

type Template = {
  id: string;
  role: string;
  skills: string[];
  duration_minutes: number;
};

const page = {
  bg: "#0b0b12",
  surface: "#15151f",
  border: "#26262f",
  text: "#f5f5f7",
  muted: "#9a9aa8",
  accent: "#8B5CF6",
};

export default function PracticeCatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  // Deep-linked from the landing page's track cards (e.g. /practice?q=Sales).
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.role.toLowerCase().includes(q));
  }, [templates, search]);

  async function startPractice(templateId: string) {
    setError(null);
    if (!name.trim()) {
      setError("Enter your name to start.");
      return;
    }

    setStartingId(templateId);
    let res: Response;
    try {
      res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName: name, templateId }),
      });
    } catch {
      setStartingId(null);
      setError("Network error — could not reach the server. Please try again.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.roomName) {
      setStartingId(null);
      setError(data.error ?? "Couldn't start the practice session. Please try again.");
      return;
    }

    router.push(
      `/interview/${data.roomName}?name=${encodeURIComponent(name)}&practice=1`
    );
  }

  return (
    <main style={{ background: page.bg, color: page.text, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "56px 32px 64px" }}>
        <h1 style={{ marginBottom: 4, fontSize: 34 }}>Warm up with a free practice round</h1>
        <p style={{ color: page.muted, fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
          Pick a role below and spend a few minutes talking through it with our AI interviewer.
          No account, no scheduling — just a short, low-stakes rep before the real thing, with
          a quick readout of how you did at the end.
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by role…"
          style={{
            width: "100%",
            maxWidth: 360,
            padding: "10px 14px",
            marginTop: 24,
            borderRadius: 8,
            border: `1px solid ${page.border}`,
            background: page.surface,
            color: page.text,
            fontSize: 15,
          }}
        />

        {error && <p style={{ color: "#f87171", marginTop: 16 }}>{error}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          {visible.map((t) => (
            <div
              key={t.id}
              style={{
                background: page.surface,
                border: `1px solid ${page.border}`,
                borderRadius: 10,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "rgba(139,92,246,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LogoMark size={24} />
              </div>
              <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                ~{t.duration_minutes} min practice round
              </div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{t.role}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(t.skills ?? []).map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 12,
                      color: "#c4b5fd",
                      background: "rgba(139,92,246,0.15)",
                      padding: "3px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>

              {openId === t.id ? (
                <div style={{ marginTop: 6 }}>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 6,
                      border: `1px solid ${page.border}`,
                      background: page.bg,
                      color: page.text,
                    }}
                  />
                  <button
                    onClick={() => startPractice(t.id)}
                    disabled={startingId === t.id}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {startingId === t.id ? "Starting…" : "Begin"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setOpenId(t.id);
                    setError(null);
                  }}
                  style={{
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "transparent",
                    color: page.text,
                    border: `1px solid ${page.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Practice this role
                </button>
              )}
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <p style={{ color: page.muted, marginTop: 24 }}>Loading roles…</p>
        )}
      </div>
    </main>
  );
}
