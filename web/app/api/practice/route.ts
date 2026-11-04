import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Public, no-auth counterpart to /api/interviews — starts a free self-serve
// practice session for anyone browsing /practice. Deliberately separate from
// the company flow rather than a branch inside it: no company session, no
// scheduling form, and the row it creates is tagged mode: "practice" so
// /api/practice/[roomName] can safely expose it back to the candidate without
// ever risking a real company interview's data.
export async function POST(req: NextRequest) {
  const { candidateName, templateId } = await req.json();

  const name = typeof candidateName === "string" ? candidateName.trim().slice(0, 80) : "";
  if (!name || !templateId) {
    return NextResponse.json(
      { error: "candidateName and templateId are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: template, error: templateError } = await supabase
    .from("question_templates")
    .select("role, questions, duration_minutes")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Unknown practice role." }, { status: 404 });
  }

  const roomName = `practice-${Date.now()}`;
  const now = new Date();
  // Generous, non-scheduling window — practice links aren't sent ahead of
  // time like company interviews, this just bounds how long a stale tab
  // could still connect.
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      room_name: roomName,
      candidate_name: name,
      job_role: template.role,
      questions: template.questions,
      status: "created",
      scheduled_start: now.toISOString(),
      scheduled_end: end.toISOString(),
      duration_minutes: template.duration_minutes,
      mode: "practice",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!.replace("wss://", "https://"),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  await roomService.createRoom({
    name: roomName,
    metadata: JSON.stringify({
      interviewId: interview.id,
      jobRole: template.role,
      questions: template.questions,
      durationMinutes: template.duration_minutes,
    }),
  });

  return NextResponse.json({ roomName, interviewId: interview.id });
}
