"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import {
  EMAIL_MAX,
  NAME_MAX,
  PRACTICE_MAX_ATTEMPTS,
  validatePracticeDetails,
  type PracticeDetails,
} from "@/lib/practice";

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginTop: 6,
  borderRadius: 6,
  border: `1px solid ${page.border}`,
  background: page.bg,
  color: page.text,
  boxSizing: "border-box",
};

// Per-browser convenience only: remembers the candidate's details so they
// don't retype them for attempts 2 and 3. Never relied on for anything.
const DETAILS_KEY = "practiceDetails";

function loadSavedDetails(): PracticeDetails {
  try {
    const saved = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? "null");
    if (saved && typeof saved === "object") {
      return {
        fullName: typeof saved.fullName === "string" ? saved.fullName : "",
        email: typeof saved.email === "string" ? saved.email : "",
        phone: typeof saved.phone === "string" ? saved.phone : "",
      };
    }
  } catch {}
  return { fullName: "", email: "", phone: "" };
}

export default function PracticeCatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  // Deep-linked from the landing page's track cards (e.g. /practice?q=Sales).
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<PracticeDetails>({ fullName: "", email: "", phone: "" });
  // Honeypot — hidden from people, filled by naive bots; the server rejects it.
  const [website, setWebsite] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Client-side throttle: after a 429 we hold the Begin buttons until the
  // server's Retry-After passes, instead of letting impatient clicks pile up.
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [limitReached, setLimitReached] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    setDetails(loadSavedDetails());
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => setError("Couldn't load practice roles. Please refresh the page."));
  }, []);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= cooldownUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  function updateDetail(field: keyof PracticeDetails, value: string) {
    setDetails((d) => ({ ...d, [field]: value }));
    setLimitReached(false);
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.role.toLowerCase().includes(q));
  }, [templates, search]);

  async function startPractice(templateId: string) {
    // Guards against double-clicks / Enter-key repeats firing several POSTs.
    if (inFlight.current || Date.now() < cooldownUntil) return;
    setError(null);

    const invalid = validatePracticeDetails(details);
    if (invalid) {
      setError(invalid);
      return;
    }

    inFlight.current = true;
    setStartingId(templateId);
    let res: Response;
    try {
      res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, website, templateId }),
      });
    } catch {
      inFlight.current = false;
      setStartingId(null);
      setError("Network error — could not reach the server. Please try again.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.roomName) {
      inFlight.current = false;
      setStartingId(null);
      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After")) || data.retryAfterSeconds || 30;
        setCooldownUntil(Date.now() + retry * 1000);
        setNow(Date.now());
      }
      if (res.status === 403 && data.attemptsRemaining === 0) setLimitReached(true);
      setError(data.error ?? "Couldn't start the practice session. Please try again.");
      return;
    }

    try {
      localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
    } catch {}

    router.push(
      `/interview/${data.roomName}?name=${encodeURIComponent(details.fullName.trim())}&practice=1`
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

        {/* Form errors render inside the open card; this is only for page-level ones. */}
        {error && !openId && <p style={{ color: "#f87171", marginTop: 16 }}>{error}</p>}

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
                <form
                  style={{ marginTop: 6 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    startPractice(t.id);
                  }}
                >
                  <input
                    autoFocus
                    required
                    value={details.fullName}
                    onChange={(e) => updateDetail("fullName", e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    maxLength={NAME_MAX}
                    style={inputStyle}
                  />
                  <input
                    required
                    type="email"
                    value={details.email}
                    onChange={(e) => updateDetail("email", e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    maxLength={EMAIL_MAX}
                    style={inputStyle}
                  />
                  <input
                    required
                    type="tel"
                    value={details.phone}
                    onChange={(e) => updateDetail("phone", e.target.value)}
                    placeholder="Phone (e.g. +8801712345678)"
                    autoComplete="tel"
                    maxLength={24}
                    style={inputStyle}
                  />
                  {/* Honeypot: off-screen, unfocusable, ignored by autofill. */}
                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: -10000, width: 1, height: 1, opacity: 0 }}
                  />
                  <button
                    type="submit"
                    disabled={startingId !== null || cooldownSeconds > 0 || limitReached}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: startingId || cooldownSeconds || limitReached ? "not-allowed" : "pointer",
                      opacity: startingId || cooldownSeconds || limitReached ? 0.6 : 1,
                    }}
                  >
                    {startingId === t.id
                      ? "Starting…"
                      : limitReached
                        ? "No attempts left"
                        : cooldownSeconds > 0
                          ? `Try again in ${cooldownSeconds}s`
                          : "Begin"}
                  </button>
                  {error && (
                    <p role="alert" style={{ fontSize: 13, color: "#f87171", marginTop: 8, lineHeight: 1.4 }}>
                      {error}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: page.muted, marginTop: 8, lineHeight: 1.4 }}>
                    Up to {PRACTICE_MAX_ATTEMPTS} free attempts per person. Your score appears
                    after each attempt.
                  </p>
                </form>
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
