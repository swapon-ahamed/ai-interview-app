import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

// GET /api/interviews — list the signed-in company's own interviews (newest first)
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("interviews")
    .select("id, room_name, candidate_name, job_role, status, score, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ interviews: data });
}


// Creates an interview record + a LiveKit room whose metadata tells the AI
// agent what job role / questions to use for this specific interview.
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const {
    candidateName,
    jobRole,
    questions,
    scheduledStart,
    scheduledEnd,
    durationMinutes,
  } = await req.json();

  if (!candidateName || !jobRole) {
    return NextResponse.json(
      { error: "candidateName and jobRole are required" },
      { status: 400 }
    );
  }

  const roomName = `interview-${Date.now()}`;
  const now = new Date();
  const start = scheduledStart ? new Date(scheduledStart) : now;
  const end = scheduledEnd ? new Date(scheduledEnd) : new Date(now.getTime() + 3 * 60 * 60 * 1000); // default: active for 3 hours
  const duration = typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : 2; // default: 2 min session

  if (end <= start) {
    return NextResponse.json(
      { error: "Interview window end must be after start." },
      { status: 400 }
    );
  }

  const finalQuestions: string[] =
    Array.isArray(questions) && questions.length > 0
      ? questions
      : [
          "Ask the candidate to briefly introduce themselves and their background.",
          `Ask one conceptual question relevant to the ${jobRole} role.`,
          "Ask a behavioral question about handling disagreement with a teammate.",
          "Thank the candidate and let them know the interview is complete.",
        ];

  // 1. Save the interview record in Supabase
  const supabase = getSupabaseAdmin();
  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      room_name: roomName,
      candidate_name: candidateName,
      job_role: jobRole,
      questions: finalQuestions,
      status: "created",
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      duration_minutes: duration,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Create the LiveKit room with metadata the agent will read on join
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!.replace("wss://", "https://"),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  await roomService.createRoom({
    name: roomName,
    metadata: JSON.stringify({
      interviewId: interview.id,
      jobRole,
      questions: finalQuestions,
      durationMinutes: duration,
    }),
  });

  return NextResponse.json({ roomName, interviewId: interview.id });
}
