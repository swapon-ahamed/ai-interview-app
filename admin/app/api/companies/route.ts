import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { emailVerifiedByUserId, requireAdmin } from "@/lib/auth";

// Lists every company for the admin dashboard grid. Any signed-in admin can
// see the full directory (shared workspace, not per-admin scoping) — but the
// caller must still present a valid session token, so this isn't a fully
// public endpoint.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("companies")
    .select("id, user_id, company_name, email, mobile_number, contact_address, status, signup_source, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const verified = await emailVerifiedByUserId();
  const companies = (data ?? []).map(({ user_id, ...c }) => ({
    ...c,
    email_verified: verified.get(user_id) ?? false,
  }));

  return NextResponse.json({ companies });
}
