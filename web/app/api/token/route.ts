import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readJsonBody } from "@/lib/rateLimit";

// Mints a short-lived LiveKit token so the candidate's browser can join the
// interview room. The AI agent (agent/main.py) auto-joins the same room name
// once it detects a participant has connected.
export async function POST(req: NextRequest) {
  const body = await readJsonBody(req, 2048);
  const { candidateName, roomName } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof candidateName !== "string" ||
    typeof roomName !== "string" ||
    !candidateName.trim() ||
    !roomName ||
    candidateName.length > 120 ||
    roomName.length > 128
  ) {
    return NextResponse.json(
      { error: "candidateName and roomName are required" },
      { status: 400 }
    );
  }

  // Check the interview's scheduled window
  const supabase = getSupabaseAdmin();
  const { data: interview, error } = await supabase
    .from("interviews")
    .select("scheduled_start, scheduled_end, status, mode, duration_minutes, questions")
    .eq("room_name", roomName)
    .single();

  if (error || !interview) {
    return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  }

  // A finished practice session can't be rejoined — otherwise one claimed
  // attempt could be replayed for unlimited free AI sessions. (Company
  // interviews keep their existing behaviour.) Reconnecting mid-session is
  // still allowed since status is "in_progress" until the agent shuts down.
  if (interview.mode === "practice" && interview.status === "completed") {
    return NextResponse.json(
      { error: "This practice session has already finished." },
      { status: 410 }
    );
  }

  const now = new Date();

  if (interview.scheduled_start && now < new Date(interview.scheduled_start)) {
    return NextResponse.json(
      {
        error: `This interview hasn't started yet. It opens at ${new Date(
          interview.scheduled_start
        ).toLocaleString()}.`,
      },
      { status: 403 }
    );
  }

  if (interview.scheduled_end && now > new Date(interview.scheduled_end)) {
    return NextResponse.json(
      { error: "This interview link has expired. Please contact the recruiter for a new link." },
      { status: 410 }
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

  // Handed back alongside the token so the room UI (progress bar, countdown,
  // post-call redirect) doesn't need its own authenticated Supabase read —
  // none of this is sensitive, it's the same plan the agent already read
  // off the room's metadata.
  return NextResponse.json({
    token: await token.toJwt(),
    mode: interview.mode,
    durationMinutes: interview.duration_minutes,
    questions: interview.questions,
  });
}
