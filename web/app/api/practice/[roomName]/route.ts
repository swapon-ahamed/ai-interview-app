import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Public, no-auth — but scoped to mode = "practice" so this can never return
// a real company interview's transcript/score even if someone guesses a room
// name. Polled by web/app/practice/[roomName]/results while the agent is
// still scoring the just-finished session.
export async function GET(
  req: NextRequest,
  { params }: { params: { roomName: string } }
) {
  const { data, error } = await getSupabaseAdmin()
    .from("interviews")
    .select("candidate_name, job_role, status, transcript, score")
    .eq("room_name", params.roomName)
    .eq("mode", "practice")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Practice session not found." }, { status: 404 });
  }
  return NextResponse.json({ interview: data });
}
