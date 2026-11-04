import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

const VALID_STATUSES = ["pending", "active"] as const;

// Moderation action, separate from the general company-edit PATCH: any
// signed-in admin can flip a company between 'pending' (default on
// registration) and 'active' — this is what actually gates the company from
// being treated as approved (see web/app/signin, which blocks pending
// companies from signing in).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const body = await req.json();
  const status = body.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("companies")
    .update({ status })
    .eq("id", params.id)
    .select("id, company_name, email, mobile_number, contact_address, status, created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ company: data });
}
