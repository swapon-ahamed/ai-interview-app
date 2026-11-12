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
  attempt_number: number | null;
};

type AttemptSummary = {
  attemptNumber: number | null;
  jobRole: string;
  status: string;
  overallScore: number | null;
  recommendation: string | null;
  createdAt: string;
};

type Attempts = {
  max: number;
  used: number;
  remaining: number;
  history: AttemptSummary[];
};

// Polling backs off (2.5s → 10s) so a tab left open — or many of them —
// doesn't hammer the API, and it pauses while the tab is hidden.
const POLL_START_MS = 2500;
const POLL_MAX_MS = 10_000;
const MAX_POLLS = 30; // ~3.5 min before we give up waiting on a score

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
  const [attempts, setAttempts] = useState<Attempts | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const pollsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = POLL_START_MS;

    function schedule(ms: number) {
      timer = setTimeout(poll, ms);
    }

    async function poll() {
      if (cancelled) return;
      if (document.visibilityState === "hidden") {
        schedule(delay); // don't count hidden ticks against MAX_POLLS
        return;
      }

      let res: Response | null = null;
      let data: any = {};
      try {
        res = await fetch(`/api/practice/${encodeURIComponent(roomName)}`, { cache: "no-store" });
        data = await res.json().catch(() => ({}));
      } catch {
        // network blip — fall through to retry with backoff
      }
      if (cancelled) return;

      if (res?.status === 404) {
        setNotFound(true);
        return;
      }

      if (data.interview) {
        setSession(data.interview);
        setAttempts(data.attempts ?? null);
        if (data.interview.status === "completed") return; // stop polling
      }

      pollsRef.current += 1;
      if (pollsRef.current >= MAX_POLLS) {
        setGaveUp(true);
        return;
      }

      const retryAfter = res?.status === 429 ? Number(res.headers.get("Retry-After")) * 1000 : 0;
      delay = Math.min(Math.round(delay * 1.3), POLL_MAX_MS);
      schedule(Math.max(delay, retryAfter || 0));
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [roomName]);

  const stillWaiting = !notFound && (!session || (session.status !== "completed" && !gaveUp));
  const outOfAttempts = attempts !== null && attempts.remaining === 0;

  return (
    <main style={{ background: page.bg, color: page.text, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 64px" }}>
        <h1 style={{ marginBottom: 4 }}>Your practice results</h1>
        <p style={{ color: page.muted }}>
          {session?.job_role ?? "Practice interview"}
          {attempts && session?.attempt_number
            ? ` · Attempt ${session.attempt_number} of ${attempts.max}`
            : ""}
        </p>

        {attempts && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 14,
              background: outOfAttempts ? "rgba(248,113,113,0.12)" : page.surface,
              border: `1px solid ${outOfAttempts ? "rgba(248,113,113,0.4)" : page.border}`,
              color: outOfAttempts ? "#fca5a5" : page.text,
            }}
          >
            {outOfAttempts
              ? `You've used all ${attempts.max} free practice attempts.`
              : `${attempts.remaining} of ${attempts.max} free practice attempt${
                  attempts.max === 1 ? "" : "s"
                } remaining.`}
          </div>
        )}

        {notFound && (
          <p style={{ marginTop: 32, color: page.muted }}>
            We couldn't find this practice session.
          </p>
        )}

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

        {attempts && attempts.history.length > 1 && (
          <AttemptHistory history={attempts.history} max={attempts.max} />
        )}

        <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
          {outOfAttempts ? (
            <Link
              href="/book-demo"
              style={{
                padding: "10px 20px",
                border: `1px solid ${page.border}`,
                color: page.text,
                textDecoration: "none",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              Talk to us about full interviews
            </Link>
          ) : (
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
              {attempts ? "Use another attempt" : "Practice another role"}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function AttemptHistory({ history, max }: { history: AttemptSummary[]; max: number }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your attempts</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map((h, i) => (
          <div
            key={`${h.createdAt}-${i}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: page.surface,
              border: `1px solid ${page.border}`,
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                Attempt {h.attemptNumber ?? i + 1} of {max} · {h.jobRole}
              </div>
              <div style={{ color: page.muted, fontSize: 12, marginTop: 2 }}>
                {new Date(h.createdAt).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              {h.overallScore !== null ? (
                <>
                  <span style={{ fontWeight: 800, color: "#c4b5fd" }}>{h.overallScore}/5</span>
                  {h.recommendation && (
                    <div style={{ color: page.muted, fontSize: 12 }}>{h.recommendation}</div>
                  )}
                </>
              ) : (
                <span style={{ color: page.muted }}>
                  {h.status === "completed" ? "No score" : "In progress"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
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
