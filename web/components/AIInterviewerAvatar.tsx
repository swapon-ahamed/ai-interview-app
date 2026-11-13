"use client";

import { useIsSpeaking, useMultibandTrackVolume, useTracks } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";

const LABEL = "AI Interviewer";
const BAR_COUNT = 7;

// Video-call-style tile for the AI agent. The agent publishes audio only, so
// instead of a camera feed we show an "AI" avatar whose rings pulse and whose
// bars move with the agent's real voice level — making it obvious when the
// interviewer is talking vs. listening.
export function AIInterviewerAvatar() {
  const micTracks = useTracks([Track.Source.Microphone]);
  const agentTrack = micTracks.find((t) => !t.participant.isLocal) as TrackReference | undefined;

  if (!agentTrack) {
    return <Tile speaking={false} bars={null} status="Connecting to your AI Interviewer…" />;
  }

  return <SpeakingTile trackRef={agentTrack} />;
}

function SpeakingTile({ trackRef }: { trackRef: TrackReference }) {
  const speaking = useIsSpeaking(trackRef.participant);
  const bars = useMultibandTrackVolume(trackRef, { bands: BAR_COUNT, loPass: 100, hiPass: 200 });
  return <Tile speaking={speaking} bars={bars} status={speaking ? "Speaking…" : "Listening…"} />;
}

function Tile({ speaking, bars, status }: { speaking: boolean; bars: number[] | null; status: string }) {
  return (
    <div className="tile">
      <div className="header">
        <span className={speaking ? "dot dot-on" : "dot"} />
        <span>{LABEL}</span>
        <span className="live">LIVE</span>
      </div>

      <div className="stage">
        <div className={speaking ? "ring ring1 on" : "ring ring1"} />
        <div className={speaking ? "ring ring2 on" : "ring ring2"} />
        <div className={speaking ? "avatar avatar-on" : "avatar"}>AI</div>
      </div>

      <div className="bars" aria-hidden>
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const v = bars?.[i] ?? 0;
          const h = 6 + Math.min(1, v * 2.2) * 38;
          return <span key={i} className="bar" style={{ height: h, opacity: speaking ? 1 : 0.35 }} />;
        })}
      </div>

      <p className="status">{status}</p>

      <style jsx>{`
        .tile {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 280px;
          border-radius: 12px;
          overflow: hidden;
          background: radial-gradient(ellipse at center, #1c1a2e 0%, #0e0e16 70%);
          color: #fff;
          font-family: sans-serif;
        }
        .header {
          position: absolute;
          top: 12px;
          left: 14px;
          right: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #c4c4d1;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #555;
          transition: background 0.2s;
        }
        .dot-on {
          background: #22c55e;
        }
        .live {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.5);
          border-radius: 4px;
          padding: 2px 6px;
        }
        .stage {
          position: relative;
          width: 180px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .avatar {
          position: relative;
          z-index: 2;
          width: 112px;
          height: 112px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .avatar-on {
          transform: scale(1.04);
          box-shadow: 0 0 40px 6px rgba(139, 92, 246, 0.55);
        }
        .ring {
          position: absolute;
          width: 112px;
          height: 112px;
          border-radius: 50%;
          border: 2px solid rgba(139, 92, 246, 0.6);
          opacity: 0;
        }
        .ring.on {
          animation: pulse 1.6s ease-out infinite;
        }
        .ring2.on {
          animation-delay: 0.8s;
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .bars {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 48px;
          margin-top: 18px;
        }
        .bar {
          width: 6px;
          border-radius: 3px;
          background: #8b5cf6;
          transition: height 0.08s linear, opacity 0.2s;
        }
        .status {
          margin-top: 10px;
          font-size: 14px;
          color: #aaa;
        }
      `}</style>
    </div>
  );
}
