import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

// Lists every interview across every company, for the admin interviews page.
// interviews and companies both reference auth.users independently (no direct
// FK between them), so PostgREST can't embed one in the other — fetch both
// and join company_name in by user_id here instead.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const supabaseAdmin = getSupabaseAdmin();

  const [{ data: interviews, error: interviewsError }, { data: companies, error: companiesError }] =
    await Promise.all([
      supabaseAdmin
        .from("interviews")
        .select(
          "id, room_name, candidate_name, job_role, status, scheduled_start, scheduled_end, created_at, user_id"
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("companies").select("user_id, company_name"),
    ]);

  if (interviewsError) {
    return NextResponse.json({ error: interviewsError.message }, { status: 500 });
  }
  if (companiesError) {
    return NextResponse.json({ error: companiesError.message }, { status: 500 });
  }

  const companyNameByUserId = new Map(
    (companies ?? []).map((c) => [c.user_id, c.company_name])
  );

  const result = (interviews ?? []).map((i) => ({
    ...i,
    company_name: i.user_id ? companyNameByUserId.get(i.user_id) ?? null : null,
  }));

  return NextResponse.json({ interviews: result });
}
