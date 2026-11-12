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

// Same shape as the real scorer's output (agent/main.py SCORING_PROMPT).
const OVERALL = { score: 5, recommendation: "Strong yes" };

const STEP_MS = 4000;

export default function LiveInterviewClient() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  // True once playback has actually reached and dwelt on the final answer —
  // not merely when someone jumps to the last step with the scrubber.
  const [finished, setFinished] = useState(false);

  const isLast = step === SCRIPT.length - 1;

  useEffect(() => {
    if (!playing) return;
    // Let the final answer stay on screen for a full step before ending,
    // instead of stopping (and announcing "complete") the instant it appears.
    const id = setTimeout(() => {
      if (isLast) {
        setPlaying(false);
        setFinished(true);
      } else {
        setStep((s) => Math.min(s + 1, SCRIPT.length - 1));
      }
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [playing, step, isLast]);

  function goTo(i: number) {
    setStep(Math.max(0, Math.min(SCRIPT.length - 1, i)));
    setFinished(false);
  }

  function togglePlay() {
    if (finished || (isLast && !playing)) {
      setStep(0);
      setSeconds(0);
      setFinished(false);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }

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
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 16px 64px", textAlign: "center" }}>
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
          Sample walkthrough
        </span>
        <h1 style={{ fontSize: "clamp(26px, 6vw, 36px)", marginTop: 20 }}>See a live interview end to end</h1>
        <p style={{ color: page.muted, marginTop: 12, maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          An illustrative sample session with a fictional candidate: the AI interviewer&apos;s
          questions, the candidate&apos;s answers, and the scorecard that lands in the
          recruiter&apos;s dashboard minutes later.
        </p>

        <div
          style={{
            display: "grid",
            // Two columns on desktop, stacked on phones (was a fixed
            // "1.4fr 1fr" that crushed both panels and overflowed at 390px).
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
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
                <span aria-hidden="true" style={{ color: playing ? "#f87171" : "#6b6b78" }}>●</span> Sample · {ROLE_LABEL}
              </span>
              <span
                aria-label={`Elapsed ${mm} minutes ${ss} seconds`}
                style={{ border: `1px solid ${page.border}`, borderRadius: 4, padding: "2px 8px", fontVariantNumeric: "tabular-nums" }}
              >
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
                  aria-hidden="true"
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
                  aria-hidden="true"
                >
                  👤
                </div>
                <div style={{ fontSize: 13, color: "#c4c4d1" }}>Candidate — {CANDIDATE_NAME}</div>
              </div>
            </div>

            <div style={{ padding: 16, borderTop: `1px solid ${page.border}` }}>
              {/* Announced to screen readers as the script advances. */}
              <div aria-live="polite" aria-atomic="true">
                <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
                  {current.speaker === "ai" ? "AI Interviewer" : "Candidate response"}
                </div>
                {/* Tall enough for the longest line on a phone, so the
                    controls below don't jump around as text changes. */}
                <p style={{ fontSize: 14, color: page.text, minHeight: 84, lineHeight: 1.5, margin: 0 }}>{current.text}</p>
                {finished && (
                  <p style={{ fontSize: 14, color: "#a78bfa", marginTop: 8 }}>
                    Interview complete. Scorecard generated — see the scorecard preview.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                {SCRIPT.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Jump to step ${i + 1} of ${SCRIPT.length}`}
                    aria-current={i === step ? "step" : undefined}
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
                  onClick={() => goTo(step - 1)}
                  disabled={step === 0}
                  style={{ ...iconButtonStyle, opacity: step === 0 ? 0.4 : 1 }}
                  aria-label="Previous"
                >
                  <span aria-hidden="true">⏮</span>
                </button>
                <button
                  onClick={togglePlay}
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
                  {playing ? (
                    <><span aria-hidden="true">❚❚</span> Pause</>
                  ) : finished || isLast ? (
                    <><span aria-hidden="true">↺</span> Replay</>
                  ) : (
                    <><span aria-hidden="true">▷</span> {step === 0 && seconds === 0 ? "Play" : "Resume"}</>
                  )}
                </button>
                <button
                  onClick={() => goTo(step + 1)}
                  disabled={isLast}
                  style={{ ...iconButtonStyle, opacity: isLast ? 0.4 : 1 }}
                  aria-label="Next"
                >
                  <span aria-hidden="true">⏭</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scorecard preview */}
          <div style={{ background: page.surface, border: `1px solid ${page.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
              Scorecard preview
            </div>
            <h2 style={{ fontSize: 19, marginTop: 8, marginBottom: 12 }}>What the recruiter sees</h2>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "10px 12px",
                marginBottom: 16,
                background: "rgba(139,92,246,0.15)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 800, color: "#c4b5fd" }}>{OVERALL.score}/5</span>
              <span style={{ color: "#c4b5fd", fontWeight: 600, fontSize: 14 }}>
                Overall · {OVERALL.recommendation}
              </span>
            </div>

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
