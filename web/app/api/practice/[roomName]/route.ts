import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PRACTICE_MAX_ATTEMPTS } from "@/lib/practice";

// Public, no-auth — but scoped to mode = "practice" so this can never return
// a real company interview's transcript/score even if someone guesses a room
// name (new practice room names are random UUIDs anyway). Polled by
// web/app/practice/[roomName]/results while the agent is still scoring the
// just-finished session. Never returns the candidate's email or phone.
export async function GET(
  req: NextRequest,
  { params }: { params: { roomName: string } }
) {
  const noStore = { "Cache-Control": "no-store" };

  if (!/^practice-[A-Za-z0-9-]{1,64}$/.test(params.roomName)) {
    return NextResponse.json({ error: "Practice session not found." }, { status: 404, headers: noStore });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("interviews")
    .select("candidate_name, job_role, status, transcript, score, attempt_number, practice_candidate_id")
    .eq("room_name", params.roomName)
    .eq("mode", "practice")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Practice session not found." }, { status: 404, headers: noStore });
  }

  const { practice_candidate_id: candidateId, ...interview } = data;

  // Sessions created before candidate details were collected have no
  // candidate link — return them as before, without attempt info.
  let attempts = null;
  if (candidateId) {
    const [{ data: candidate }, { data: history }] = await Promise.all([
      supabase
        .from("practice_candidates")
        .select("attempts_used")
        .eq("id", candidateId)
        .single(),
      supabase
        .from("interviews")
        .select("attempt_number, job_role, status, score, created_at")
        .eq("practice_candidate_id", candidateId)
        .eq("mode", "practice")
        .order("created_at", { ascending: true })
        .limit(PRACTICE_MAX_ATTEMPTS * 2),
    ]);

    const used = candidate?.attempts_used ?? interview.attempt_number ?? 0;
    attempts = {
      max: PRACTICE_MAX_ATTEMPTS,
      used,
      remaining: Math.max(PRACTICE_MAX_ATTEMPTS - used, 0),
      history: (history ?? []).map((h) => ({
        attemptNumber: h.attempt_number,
        jobRole: h.job_role,
        status: h.status,
        overallScore: h.score?.overall_score ?? null,
        recommendation: h.score?.recommendation ?? null,
        createdAt: h.created_at,
      })),
    };
  }

  return NextResponse.json({ interview, attempts }, { headers: noStore });
}
