import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

const VALID_STATUSES = ["pending", "active"] as const;

// Moderation action, separate from the general company-edit PATCH: any
// signed-in admin can flip a company between 'pending' (default on
// registration) and 'active' — this is what actually gates the company from
// being treated as approved (see web/app/signin, which blocks pending
// companies from signing in).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const body = await req.json().catch(() => ({}));
  const status = body.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Only a company that has verified its email (clicked the signup
  // confirmation link or accepted its invite) can be approved — otherwise an
  // admin could activate an account for an address its owner never proved.
  if (status === "active") {
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("user_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    const { data: owner } = await supabaseAdmin.auth.admin.getUserById(company.user_id);
    if (!owner?.user?.email_confirmed_at) {
      return NextResponse.json(
        { error: "This company hasn't verified its email yet, so it can't be activated." },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabaseAdmin
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
