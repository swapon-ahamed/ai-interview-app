import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

// Lists every company for the admin dashboard grid. Any signed-in admin can
// see the full directory (shared workspace, not per-admin scoping) — but the
// caller must still present a valid session token, so this isn't a fully
// public endpoint.
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("companies")
    .select("id, company_name, email, mobile_number, contact_address, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ companies: data });
}
