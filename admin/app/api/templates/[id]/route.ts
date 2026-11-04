import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("question_templates")
    .select("id, role, slug, skills, duration_minutes, questions, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ template: data });
}

// Role name (and therefore slug) is intentionally not editable here, same
// reasoning as companies' email field — it's the stable identifier used in
// the public /practice/[slug] URL.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const body = await req.json();
  const skills = Array.isArray(body.skills)
    ? body.skills.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];
  const questions = Array.isArray(body.questions)
    ? body.questions.map((q: unknown) => String(q).trim()).filter(Boolean)
    : [];
  const durationMinutes = Number(body.durationMinutes) || 6;

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "At least one question/instruction is required" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("question_templates")
    .update({ skills, questions, duration_minutes: durationMinutes })
    .eq("id", params.id)
    .select("id, role, slug, skills, duration_minutes, questions, created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ template: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const { error } = await getSupabaseAdmin()
    .from("question_templates")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
