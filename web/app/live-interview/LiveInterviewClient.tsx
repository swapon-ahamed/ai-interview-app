"use client";

import { useEffect, useState } from "react";

const page = {
  bg: "#0b0b12",
  surface: "#15151f",
  border: "#26262f",
  text: "#f5f5f7",
  muted: "#9a9aa8",
  accent: "#8B5CF6",
};

// Illustrative sample script for the recorded walkthrough — not a real
// candidate or a real transcript. Kept in our own words, distinct from the
// literal placeholder copy in the source design.
const CANDIDATE_NAME = "Jordan M.";
const ROLE_LABEL = "Backend Engineer, Round 1";

type Step = { speaker: "ai" | "candidate"; text: string };

const SCRIPT: Step[] = [
  {
    speaker: "ai",
    text: "Hi Jordan, thanks for joining — let's start with a quick introduction. Tell me a bit about your background.",
  },
  {
    speaker: "candidate",
    text: "I've spent the last four years building backend services, mostly in Python and Go, focused on payments infrastructure.",
  },
  { speaker: "ai", text: "Walk me through how you'd design a rate limiter for a public API." },
  {
    speaker: "candidate",
    text: "I'd start with a token bucket per API key, backed by Redis so it works across multiple servers, then tune the refill rate per plan tier.",
  },
  { speaker: "ai", text: "Tell me about a time you disagreed with a teammate on a technical decision." },
  {
    speaker: "candidate",
    text: "We disagreed on caching strategy, so we prototyped both approaches for a day and let the numbers settle it instead of opinions.",
  },
  {
    speaker: "ai",
    text: "Last one — how do you decide whether a bug needs a hotfix or can wait for the next release?",
  },
  {
    speaker: "candidate",
    text: "I look at whether the impact is cosmetic or breaks trust — anything that silently corrupts data or blocks checkout gets a hotfix.",
  },
];

const SCORES = [
  { label: "Communication", value: 5 },
  { label: "Technical depth", value: 4 },
  { label: "Problem solving", value: 5 },
  { label: "Culture fit", value: 4 },
  { label: "English proficiency", value: 5 },
];

const STEP_MS = 4000;

export default function LiveInterviewClient() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const isLast = step === SCRIPT.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (isLast) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => Math.min(s + 1, SCRIPT.length - 1)), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, step, isLast]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const current = SCRIPT[step];
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <main style={{ background: page.bg, color: page.text, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 32px 64px", textAlign: "center" }}>
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
          Recorded walkthrough
        </span>
        <h1 style={{ fontSize: 36, marginTop: 20 }}>See a live interview end to end</h1>
        <p style={{ color: page.muted, marginTop: 12, maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          A sample session, replayed: the AI interviewer&apos;s questions, the candidate&apos;s
          answers, and the scorecard that lands in the recruiter&apos;s dashboard minutes later.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 16,
            marginTop: 36,
            textAlign: "left",
            alignItems: "start",
          }}
        >
          {/* Player */}
          <div style={{ background: page.surface, border: `1px solid ${page.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: `1px solid ${page.border}`,
                fontSize: 13,
                color: "#c4c4d1",
              }}
            >
              <span>
                <span style={{ color: "#f87171" }}>●</span> Recorded · {ROLE_LABEL}
              </span>
              <span style={{ border: `1px solid ${page.border}`, borderRadius: 4, padding: "2px 8px", fontVariantNumeric: "tabular-nums" }}>
                {mm}:{ss}
              </span>
            </div>

            <div style={{ display: "flex" }}>
              <div style={{ flex: 1, padding: "28px 12px", textAlign: "center", borderRight: `1px solid ${page.border}` }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                    margin: "0 auto 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    boxShadow: current.speaker === "ai" ? "0 0 0 3px rgba(139,92,246,0.35)" : "none",
                  }}
                >
                  🎙
                </div>
                <div style={{ fontSize: 13, color: "#c4c4d1" }}>AI Interviewer</div>
              </div>
              <div style={{ flex: 1, padding: "28px 12px", textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#2a2a35",
                    margin: "0 auto 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: "#6b6b78",
                    boxShadow: current.speaker === "candidate" ? "0 0 0 3px rgba(139,92,246,0.35)" : "none",
                  }}
                >
                  👤
                </div>
                <div style={{ fontSize: 13, color: "#c4c4d1" }}>Candidate — {CANDIDATE_NAME}</div>
              </div>
            </div>

            <div style={{ padding: 16, borderTop: `1px solid ${page.border}` }}>
              <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
                {current.speaker === "ai" ? "AI Interviewer" : "Candidate response"}
              </div>
              <p style={{ fontSize: 14, color: page.text, minHeight: 40, lineHeight: 1.5 }}>{current.text}</p>
              {isLast && !playing && seconds > 0 && (
                <p style={{ fontSize: 14, color: "#a78bfa", marginTop: 8 }}>
                  Interview complete. Scorecard generated below.
                </p>
              )}

              <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                {SCRIPT.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    aria-label={`Jump to step ${i + 1}`}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      background: i <= step ? page.accent : "#2a2a35",
                    }}
                  />
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 14 }}>
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  style={iconButtonStyle}
                  aria-label="Previous"
                >
                  ⏮
                </button>
                <button
                  onClick={() => {
                    if (isLast) {
                      setStep(0);
                      setSeconds(0);
                      setPlaying(true);
                    } else {
                      setPlaying((p) => !p);
                    }
                  }}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 6,
                    border: `1px solid ${page.accent}`,
                    background: "transparent",
                    color: "#c4b5fd",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {isLast ? "↺ Replay" : playing ? "❚❚ Pause" : "▷ Play"}
                </button>
                <button
                  onClick={() => setStep((s) => Math.min(SCRIPT.length - 1, s + 1))}
                  style={iconButtonStyle}
                  aria-label="Next"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          {/* Scorecard preview */}
          <div style={{ background: page.surface, border: `1px solid ${page.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
              Scorecard preview
            </div>
            <h2 style={{ fontSize: 19, marginTop: 8, marginBottom: 16 }}>What the recruiter sees</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SCORES.map((s) => (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span>{s.label}</span>
                    <span style={{ color: page.muted }}>{s.value}/5</span>
                  </div>
                  <div style={{ height: 6, background: page.border, borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${(s.value / 5) * 100}%`,
                        height: "100%",
                        background: page.accent,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 13, color: page.muted, marginTop: 20, lineHeight: 1.5, fontStyle: "italic" }}>
              &quot;Clear, structured answers with concrete examples throughout — recommend
              advancing to the next round.&quot;
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 6,
  border: `1px solid ${page.border}`,
  background: page.bg,
  color: page.text,
  cursor: "pointer",
};
