"use client";

import "@livekit/components-styles";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useDataChannel,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AIInterviewerAvatar } from "@/components/AIInterviewerAvatar";

// Must match agent/main.py's PROGRESS_TOPIC.
const PROGRESS_TOPIC = "interview-progress";

type JoinInfo = {
  token: string;
  mode: "company" | "practice";
  durationMinutes: number;
  questions: string[];
};

export default function InterviewPage() {
  const { roomName } = useParams<{ roomName: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") ?? "Candidate";
  const [join, setJoin] = useState<JoinInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateName: name, roomName }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setJoin(data);
      });
  }, [name, roomName]);

  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  if (ended) {
    return (
      <EndedScreen
        mode={join?.mode ?? "company"}
        onViewResults={() => router.push(`/practice/${roomName}/results`)}
      />
    );
  }

  if (!join) return <p style={{ padding: 40 }}>Connecting to your interview…</p>;

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={join.token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      onDisconnected={() => setEnded(true)}
    >
      {/* Plays the AI agent's TTS audio out loud — required even though we don't show its video */}
      <RoomAudioRenderer />

      <TopBar durationMinutes={join.durationMinutes} questions={join.questions} />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8 }}>
        <AIInterviewerAvatar />
        <CandidateSelfView />
      </div>

      <ControlBar />
    </LiveKitRoom>
  );
}

function EndedScreen({
  mode,
  onViewResults,
}: {
  mode: "company" | "practice";
  onViewResults: () => void;
}) {
  return (
    <main style={{ maxWidth: 480, margin: "120px auto", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>That's a wrap</h1>
      {mode === "practice" ? (
        <>
          <p style={{ color: "#555" }}>
            Nice work. We're putting together your feedback now — it only takes a few seconds.
          </p>
          <button
            onClick={onViewResults}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            See how I did
          </button>
        </>
      ) : (
        <p style={{ color: "#555" }}>
          Thanks for completing your interview. The recruiting team will follow up with next
          steps — you can close this window now.
        </p>
      )}
    </main>
  );
}

// Countdown + segmented plan-progress bar, shown above the call. The
// countdown is a client-side approximation (starts once this component
// mounts, i.e. roughly when the candidate joins) — the agent enforces the
// actual hard cutoff server-side (agent/main.py's enforce_duration), this is
// just a visual cue, not the source of truth.
function TopBar({ durationMinutes, questions }: { durationMinutes: number; questions: string[] }) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useDataChannel(PROGRESS_TOPIC, (msg) => {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(msg.payload));
      if (typeof parsed.step === "number") setStep(parsed.step);
    } catch {
      // ignore malformed progress payloads
    }
  });

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const low = secondsLeft <= 60;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", borderBottom: "1px solid #222" }}>
      <div style={{ flex: 1, display: "flex", gap: 4 }}>
        {questions.map((q, i) => (
          <div
            key={i}
            title={q}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i <= step ? "#8B5CF6" : "#333",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontVariantNumeric: "tabular-nums",
          fontFamily: "monospace",
          fontSize: 14,
          color: low ? "#f87171" : "#aaa",
        }}
      >
        {mm}:{ss}
      </div>
    </div>
  );
}

function CandidateSelfView() {
  const tracks = useTracks([Track.Source.Camera]);
  const myTrack = tracks.find((t) => t.participant.isLocal);

  if (!myTrack) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#222", color: "#888" }}>
        Waiting for camera…
      </div>
    );
  }

  return (
    <GridLayout tracks={[myTrack]} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}
