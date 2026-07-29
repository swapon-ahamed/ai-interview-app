"use client";

import { useState } from "react";

const page = {
  bg: "#0b0b12",
  surface: "#15151f",
  border: "#26262f",
  text: "#f5f5f7",
  muted: "#9a9aa8",
  accent: "#8B5CF6",
};

const ROLE_BANDS = ["1-5", "5-20", "20-50", "50+"];

const FEATURES = [
  { icon: "🎥", title: "A live mock interview", body: "Watch the AI interviewer run a real session on your own rubric." },
  { icon: "📊", title: "A real scorecard", body: "See exactly what your recruiters and hiring managers would receive." },
  { icon: "⚙️", title: "Your stack, mapped", body: "We'll cover how AI Interview fits your ATS and interview workflow." },
  { icon: "💲", title: "Pricing for your volume", body: "Leave with a plan and number that fits your hiring pace." },
];

export default function BookDemoClient() {
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [rolesPerMonth, setRolesPerMonth] = useState(ROLE_BANDS[0]);
  const [rolesHiringFor, setRolesHiringFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !workEmail.trim() || !companyName.trim()) {
      setError("Full name, work email, and company are required.");
      return;
    }

    setLoading(true);
    let res: Response;
    try {
      res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, workEmail, companyName, rolesPerMonth, rolesHiringFor }),
      });
    } catch {
      setLoading(false);
      setError("Network error — could not reach the server. Please try again.");
      return;
    }

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to send your request. Please try again.");
      return;
    }
    setDone(true);
  }

  return (
    <main style={{ background: page.bg, color: page.text, fontFamily: "sans-serif", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>
          <div>
            <span
              style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 600,
                color: "#c4b5fd",
                background: "rgba(139,92,246,0.15)",
                padding: "5px 14px",
                borderRadius: 999,
              }}
            >
              Book a demo
            </span>
            <h1 style={{ fontSize: 38, lineHeight: 1.15, marginTop: 20 }}>
              See how your team would run interviews on AI Interview
            </h1>
            <p style={{ color: page.muted, marginTop: 16, lineHeight: 1.6, maxWidth: 440 }}>
              Fifteen minutes with a product specialist. We&apos;ll walk through a live interview
              on your rubric and show you the scorecard your recruiters would see.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 32 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <span>
                    <div style={{ fontWeight: 700 }}>{f.title}</div>
                    <div style={{ fontSize: 14, color: page.muted, marginTop: 2 }}>{f.body}</div>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: page.surface, border: `1px solid ${page.border}`, borderRadius: 12, padding: 28 }}>
            {done ? (
              <div>
                <h2 style={{ marginTop: 0 }}>Thanks — we&apos;ll be in touch</h2>
                <p style={{ color: page.muted, lineHeight: 1.6 }}>
                  A product specialist will reach out to <strong>{workEmail}</strong> shortly to
                  find a time.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ marginTop: 0, fontSize: 20 }}>Tell us about your team</h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                  <div>
                    <label style={labelStyle}>Full name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jordan Reyes"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Work email</label>
                    <input
                      type="email"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="you@company.com"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <label style={{ ...labelStyle, marginTop: 16 }}>Company</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  style={inputStyle}
                />

                <label style={{ ...labelStyle, marginTop: 16 }}>Roles hired per month</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {ROLE_BANDS.map((band) => (
                    <button
                      type="button"
                      key={band}
                      onClick={() => setRolesPerMonth(band)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 6,
                        border: `1px solid ${rolesPerMonth === band ? page.accent : page.border}`,
                        background: rolesPerMonth === band ? "rgba(139,92,246,0.15)" : "transparent",
                        color: rolesPerMonth === band ? "#c4b5fd" : page.text,
                        cursor: "pointer",
                      }}
                    >
                      {band}
                    </button>
                  ))}
                </div>

                <label style={{ ...labelStyle, marginTop: 16 }}>What roles are you hiring for?</label>
                <textarea
                  value={rolesHiringFor}
                  onChange={(e) => setRolesHiringFor(e.target.value)}
                  rows={3}
                  placeholder="e.g. product designers, support engineers…"
                  style={{ ...inputStyle, resize: "vertical" }}
                />

                {error && <p style={{ color: "#f87171", marginTop: 12, fontSize: 14 }}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop: 20,
                    padding: "12px 0",
                    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Sending…" : "Request demo"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#c4c4d1",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 6,
  border: "1px solid #26262f",
  background: "#0f0f16",
  color: "#f5f5f7",
  fontSize: 14,
  fontFamily: "inherit",
};
