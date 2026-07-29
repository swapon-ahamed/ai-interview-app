import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

function slugify(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Lists every question template for the admin dashboard grid — same access
// model as /api/companies (any signed-in admin, shared directory, no
// per-row ownership).
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("question_templates")
    .select("id, role, slug, skills, duration_minutes, questions, created_at")
    .order("role");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: data });
}

// Creates a new role in the catalog that both the company create-interview
// picker and the public /practice page read from.
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const body = await req.json();
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const skills = Array.isArray(body.skills)
    ? body.skills.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];
  const questions = Array.isArray(body.questions)
    ? body.questions.map((q: unknown) => String(q).trim()).filter(Boolean)
    : [];
  const durationMinutes = Number(body.durationMinutes) || 6;

  if (!role || questions.length === 0) {
    return NextResponse.json(
      { error: "role and at least one question/instruction are required" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("question_templates")
    .insert({
      role,
      slug: slugify(role),
      skills,
      questions,
      duration_minutes: durationMinutes,
    })
    .select("id, role, slug, skills, duration_minutes, questions, created_at")
    .single();

  if (error) {
    const message = error.code === "23505" ? "A template for this role already exists." : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ template: data });
}
