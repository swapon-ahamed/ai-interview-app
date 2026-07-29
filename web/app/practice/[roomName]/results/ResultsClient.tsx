"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type ScoreCard = {
  overall_score: number;
  communication: number;
  technical_depth: number;
  problem_solving: number;
  culture_fit: number;
  english_proficiency: number;
  language_feedback: string;
  summary: string;
  recommendation: string;
};

type TranscriptItem = { role: string; content: string };

type PracticeSession = {
  candidate_name: string;
  job_role: string;
  status: string;
  transcript: TranscriptItem[] | null;
  score: ScoreCard | null;
};

const POLL_MS = 2500;
const MAX_POLLS = 30; // ~75s before we give up waiting on a score

const page = {
  bg: "#0b0b12",
  surface: "#15151f",
  border: "#26262f",
  text: "#f5f5f7",
  muted: "#9a9aa8",
  accent: "#8B5CF6",
};

const METRICS: { key: keyof ScoreCard; label: string }[] = [
  { key: "communication", label: "Communication" },
  { key: "technical_depth", label: "Depth of answers" },
  { key: "problem_solving", label: "Problem solving" },
  { key: "culture_fit", label: "Overall impression" },
  { key: "english_proficiency", label: "English grammar & fluency" },
];

export default function ResultsClient() {
  const { roomName } = useParams<{ roomName: string }>();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const pollsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/practice/${roomName}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;

      if (data.interview) {
        setSession(data.interview);
        if (data.interview.status === "completed") return; // stop polling
      }

      pollsRef.current += 1;
      if (pollsRef.current >= MAX_POLLS) {
        setGaveUp(true);
        return;
      }
      setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [roomName]);

  const stillWaiting = !session || (session.status !== "completed" && !gaveUp);

  return (
    <main style={{ background: page.bg, color: page.text, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 64px" }}>
        <h1 style={{ marginBottom: 4 }}>Your practice results</h1>
        <p style={{ color: page.muted }}>{session?.job_role ?? "Practice interview"}</p>

        {stillWaiting && (
          <p style={{ marginTop: 32, color: page.muted }}>
            Reviewing your answers — this usually takes a few seconds…
          </p>
        )}

        {gaveUp && !session?.score && (
          <p style={{ marginTop: 32, color: page.muted }}>
            We couldn't generate feedback for this session in time. Your transcript is below.
          </p>
        )}

        {session?.score && <ScoreCardView score={session.score} />}

        {session?.transcript && session.transcript.length > 0 && (
          <details style={{ marginTop: 32 }}>
            <summary style={{ cursor: "pointer", color: "#c4b5fd", fontWeight: 600 }}>
              Read the full transcript
            </summary>
            <div style={{ marginTop: 12 }}>
              {session.transcript.map((item, i) => (
                <p key={i} style={{ lineHeight: 1.6, color: page.text }}>
                  <strong>{item.role === "assistant" ? "Interviewer" : "You"}:</strong>{" "}
                  {item.content}
                </p>
              ))}
            </div>
          </details>
        )}

        <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
          <Link
            href="/practice"
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            Practice another role
          </Link>
        </div>
      </div>
    </main>
  );
}

function ScoreCardView({ score }: { score: ScoreCard }) {
  return (
    <section style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          padding: 16,
          background: "rgba(139,92,246,0.15)",
          borderRadius: 10,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 800, color: "#c4b5fd" }}>
          {score.overall_score}/5
        </span>
        <span style={{ color: "#c4b5fd", fontWeight: 600 }}>{score.recommendation}</span>
      </div>

      <p style={{ marginTop: 16, color: page.text, lineHeight: 1.6 }}>{score.summary}</p>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {METRICS.map(({ key, label }) => (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
              <span>{label}</span>
              <span style={{ color: page.muted }}>{score[key]}/5</span>
            </div>
            <div style={{ height: 8, background: page.border, borderRadius: 4 }}>
              <div
                style={{
                  width: `${(Number(score[key]) / 5) * 100}%`,
                  height: "100%",
                  background: page.accent,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {score.language_feedback && (
        <p
          style={{
            marginTop: 16,
            fontSize: 14,
            color: page.text,
            background: page.surface,
            border: `1px solid ${page.border}`,
            padding: 12,
            borderRadius: 8,
          }}
        >
          <strong>On your English:</strong> {score.language_feedback}
        </p>
      )}
    </section>
  );
}
