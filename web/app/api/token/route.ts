import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

// Mints a short-lived LiveKit token so the candidate's browser can join the
// interview room. The AI agent (agent/main.py) auto-joins the same room name
// once it detects a participant has connected.
export async function POST(req: NextRequest) {
  const { candidateName, roomName } = await req.json();

  if (!candidateName || !roomName) {
    return NextResponse.json(
      { error: "candidateName and roomName are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Server missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET" },
      { status: 500 }
    );
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: candidateName,
    ttl: "30m",
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return NextResponse.json({ token: await token.toJwt() });
}
