import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/interviews — list all interviews (newest first) for the dashboard
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("interviews")
    .select("id, room_name, candidate_name, job_role, status, score, created_at, completed_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ interviews: data });
}


// Creates an interview record + a LiveKit room whose metadata tells the AI
// agent what job role / questions to use for this specific interview.
export async function POST(req: NextRequest) {
  const { candidateName, jobRole, questions } = await req.json();

  if (!candidateName || !jobRole) {
    return NextResponse.json(
      { error: "candidateName and jobRole are required" },
      { status: 400 }
    );
  }

  const roomName = `interview-${Date.now()}`;
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
    }),
  });

  return NextResponse.json({ roomName, interviewId: interview.id });
}
