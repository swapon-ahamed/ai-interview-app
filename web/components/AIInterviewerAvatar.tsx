"use client";

import { useIsSpeaking, useParticipants } from "@livekit/components-react";
import type { Participant } from "livekit-client";

const AGENT_NAME = "Ayesha";

// Finds the AI agent's participant (the only remote, non-local participant in
// the room — the agent joins as itself, the candidate is the local participant)
// and renders a face that blinks continuously and "talks" while it's speaking.
export function AIInterviewerAvatar() {
  const participants = useParticipants();
  const agent = participants.find((p) => !p.isLocal);

  if (!agent) {
    return <AvatarShell speaking={false} label={`Waiting for ${AGENT_NAME} to join…`} />;
  }

  return <SpeakingAvatar participant={agent} />;
}

function SpeakingAvatar({ participant }: { participant: Participant }) {
  const speaking = useIsSpeaking(participant);
  return (
    <AvatarShell
      speaking={speaking}
      label={speaking ? `${AGENT_NAME} is speaking…` : `${AGENT_NAME} is listening…`}
    />
  );
}

function AvatarShell({ speaking, label }: { speaking: boolean; label: string }) {
  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.glow, ...(speaking ? styles.glowActive : {}) }} />

      <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: "relative", zIndex: 2 }}>
        {/* hair */}
        <path d="M30 70 Q30 20 80 20 Q130 20 130 70 L130 55 Q80 35 30 55 Z" fill="#4a3527" />
        {/* head */}
        <ellipse cx="80" cy="85" rx="46" ry="52" fill="#e8b48c" />
        {/* ears */}
        <ellipse cx="34" cy="90" rx="7" ry="10" fill="#e8b48c" />
        <ellipse cx="126" cy="90" rx="7" ry="10" fill="#e8b48c" />
        {/* eyebrows */}
        <path d="M55 68 Q64 62 73 67" stroke="#4a3527" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M87 67 Q96 62 105 68" stroke="#4a3527" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* eyes (blink via CSS animation) */}
        <ellipse className="eye" cx="64" cy="80" rx="6" ry="7" fill="#2b2b2b" />
        <ellipse className="eye eye2" cx="96" cy="80" rx="6" ry="7" fill="#2b2b2b" />
        {/* nose */}
        <path d="M80 85 L76 100 Q80 104 84 100 Z" fill="#d69f77" />
        {/* mouth (talks via CSS animation when speaking) */}
        <ellipse
          className={speaking ? "mouth talking" : "mouth"}
          cx="80"
          cy="118"
          rx="14"
          ry="4"
          fill="#8a3b3b"
        />
      </svg>

      <p style={styles.label}>{label}</p>

      <style jsx>{`
        .eye {
          animation: blink 4.5s ease-in-out infinite;
          transform-origin: center;
        }
        .eye2 {
          animation-delay: 0.15s;
        }
        @keyframes blink {
          0%,
          92%,
          100% {
            transform: scaleY(1);
          }
          96% {
            transform: scaleY(0.1);
          }
        }
        .mouth {
          transform-origin: center;
          transition: ry 0.15s ease;
        }
        .mouth.talking {
          animation: talk 0.32s ease-in-out infinite;
        }
        @keyframes talk {
          0%,
          100% {
            ry: 4;
          }
          50% {
            ry: 11;
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
  glow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(74,222,128,0.25) 0%, rgba(74,222,128,0) 70%)",
    transition: "opacity 0.3s ease",
    opacity: 0,
  },
  glowActive: {
    opacity: 1,
  },
  label: {
    marginTop: 20,
    fontSize: 14,
    color: "#aaa",
  },
};
