import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireActiveCompany } from "@/lib/companyAuth";
import { createInterviewRoom } from "@/lib/livekit";

// GET /api/interviews — list the signed-in company's own interviews (newest first)
export async function GET(req: NextRequest) {
  // Server-side company gate: verified email + admin-approved company.
  const auth = await requireActiveCompany(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;
  const user = auth.user;

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
  // Server-side company gate: verified email + admin-approved company.
  const auth = await requireActiveCompany(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;
  const user = auth.user;

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

  // Unguessable: the room name is the candidate's join link and the key for
  // /report/[roomName], so it must not be enumerable like a timestamp.
  const roomName = `interview-${randomUUID()}`;
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

  // 2. Create the LiveKit room (metadata tells the agent what to ask) and
  //    dispatch this environment's agent into it.
  await createInterviewRoom(roomName, {
    interviewId: interview.id,
    jobRole,
    questions: finalQuestions,
    durationMinutes: duration,
  });

  return NextResponse.json({ roomName, interviewId: interview.id });
}
