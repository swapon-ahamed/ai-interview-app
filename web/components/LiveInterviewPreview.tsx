"use client";

import { useEffect, useState } from "react";

// Purely decorative mock of an in-progress interview, for the marketing
// hero — not a real LiveKit connection. The actual live room UI lives at
// web/app/interview/[roomName]/page.tsx.
const CAPTIONS = [
  "Walk me through how you'd prioritize two conflicting deadlines this week.",
  "Tell me about a time feedback changed your approach midway through a project.",
  "How would you explain a technical tradeoff to a non-technical stakeholder?",
  "What's a mistake you caught yourself making, and how did you fix it?",
];

export function LiveInterviewPreview() {
  const [captionIndex, setCaptionIndex] = useState(0);
  const [seconds, setSeconds] = useState(7 * 60 + 42);

  useEffect(() => {
    const captionTimer = setInterval(
      () => setCaptionIndex((i) => (i + 1) % CAPTIONS.length),
      4500
    );
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(captionTimer);
      clearInterval(clock);
    };
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const step = captionIndex + 1;

  return (
    <div
      style={{
        background: "#15151f",
        border: "1px solid #26262f",
        borderRadius: 12,
        overflow: "hidden",
        width: "100%",
        maxWidth: 480,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #26262f",
          fontSize: 13,
          color: "#c4c4d1",
        }}
      >
        <span>
          <span style={{ color: "#f87171" }}>●</span> Live interview · Product Design, Round 1
        </span>
        <span
          style={{
            border: "1px solid #3a3a46",
            borderRadius: 4,
            padding: "2px 8px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {mm}:{ss}
        </span>
      </div>

      <div style={{ display: "flex" }}>
        <div
          style={{
            flex: 1,
            padding: "28px 12px",
            textAlign: "center",
            borderRight: "1px solid #26262f",
          }}
        >
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
            }}
          >
            🎙
          </div>
          <div style={{ fontSize: 13, color: "#c4c4d1" }}>Ayesha — AI Interviewer</div>
          <div style={{ marginTop: 6, color: "#8B5CF6", letterSpacing: 2, fontSize: 12 }}>
            ▁▃▅▂▄▆▂
          </div>
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
            }}
          >
            👤
          </div>
          <div style={{ fontSize: 13, color: "#c4c4d1" }}>You — Candidate</div>
        </div>
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #26262f" }}>
        <div style={{ fontSize: 11, color: "#8B5CF6", letterSpacing: 1, marginBottom: 6 }}>
          LIVE CAPTION
        </div>
        <p style={{ fontSize: 14, color: "#e5e5ea", minHeight: 40 }}>{CAPTIONS[captionIndex]}</p>
        <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
          {CAPTIONS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= captionIndex ? "#8B5CF6" : "#2a2a35",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontSize: 12,
            color: "#8b8b98",
          }}
        >
          <span>
            Question {step} of {CAPTIONS.length}
          </span>
          <span>⏸ Pause</span>
        </div>
      </div>
    </div>
  );
}
