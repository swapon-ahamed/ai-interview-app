import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Public: powers both the company create-interview template picker and the
// /practice catalog. Optional ?q= does a simple role-name search for the
// practice catalog's search box.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  let query = getSupabaseAdmin()
    .from("question_templates")
    .select("id, role, slug, skills, duration_minutes, questions")
    .order("role");

  if (q) {
    query = query.ilike("role", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: data });
}
