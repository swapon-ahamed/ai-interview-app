"use client";

import "@livekit/components-styles";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Avatar3D } from "@/components/Avatar3D";

export default function InterviewPage() {
  const { roomName } = useParams<{ roomName: string }>();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") ?? "Candidate";
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateName: name, roomName }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setToken(data.token);
      });
  }, [name, roomName]);

  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;
  if (!token) return <p style={{ padding: 40 }}>Connecting to your interview…</p>;

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Plays Maya's TTS audio out loud */}
      <RoomAudioRenderer />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8 }}>
        <AIInterviewerPanel />
        <CandidateSelfView />
      </div>

      <ControlBar />
    </LiveKitRoom>
  );
}

function AIInterviewerPanel() {
  const participants = useParticipants();
  const agent = participants.find((p) => !p.isLocal);

  const micTracks = useTracks([Track.Source.Microphone]);
  const agentTrackRef = micTracks.find((t) => !t.participant.isLocal);
  const audioTrack = (agentTrackRef?.publication?.track as any)?.mediaStreamTrack as
    | MediaStreamTrack
    | undefined;

  return <Avatar3D audioTrack={audioTrack} agentPresent={!!agent} />;
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
