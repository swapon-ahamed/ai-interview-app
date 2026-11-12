import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireActiveCompany } from "@/lib/companyAuth";

// Full interview report (transcript + scores) for /report/[roomName].
// Previously public to anyone who knew or guessed the room name; now only the
// company that created the interview can read it.
export async function GET(
  req: NextRequest,
  { params }: { params: { roomName: string } }
) {
  const auth = await requireActiveCompany(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("interviews")
    .select("candidate_name, job_role, status, transcript, score, created_at, completed_at")
    .eq("room_name", params.roomName)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  }
  return NextResponse.json({ interview: data }, { headers: { "Cache-Control": "no-store" } });
}
