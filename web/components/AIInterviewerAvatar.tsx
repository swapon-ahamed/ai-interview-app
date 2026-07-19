"use client";

import { useIsSpeaking, useParticipants } from "@livekit/components-react";
import type { Participant } from "livekit-client";

// Finds the AI agent's participant (the only remote, non-local participant in
// the room — the agent joins as itself, the candidate is the local participant)
// and renders an avatar that animates while it's actively speaking (TTS playing).
export function AIInterviewerAvatar() {
  const participants = useParticipants();
  const agent = participants.find((p) => !p.isLocal);

  if (!agent) {
    return <AvatarShell speaking={false} label="Waiting for AI interviewer to join…" />;
  }

  return <SpeakingAvatar participant={agent} />;
}

function SpeakingAvatar({ participant }: { participant: Participant }) {
  const speaking = useIsSpeaking(participant);
  return (
    <AvatarShell
      speaking={speaking}
      label={speaking ? "AI Interviewer is speaking…" : "AI Interviewer is listening…"}
    />
  );
}

function AvatarShell({ speaking, label }: { speaking: boolean; label: string }) {
  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.ring, ...(speaking ? styles.ringSpeaking : {}) }} />
      <div style={{ ...styles.ring, ...styles.ringDelay, ...(speaking ? styles.ringSpeaking : {}) }} />
      <div style={styles.core}>🤖</div>
      <p style={styles.label}>{label}</p>
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          70% {
            transform: scale(1.6);
            opacity: 0;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    background: "#111",
    color: "#fff",
  },
  core: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    background: "#2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
    zIndex: 2,
  },
  ring: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: "50%",
    border: "2px solid #4ade80",
    opacity: 0,
  },
  ringSpeaking: {
    animation: "pulse 1.4s ease-out infinite",
  },
  ringDelay: {
    animationDelay: "0.7s",
  },
  label: {
    marginTop: 24,
    fontSize: 14,
    color: "#aaa",
  },
};
