"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function RoomPage() {
  const { roomName } = useParams<{ roomName: string }>();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") ?? "Candidate";
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateName: name, roomName }),
    })
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, [name, roomName]);

  if (!token) return <p style={{ padding: 40 }}>Connecting to your interview…</p>;

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: "100vh" }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
