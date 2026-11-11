import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

// Single-company fetch + edit, used by the admin dashboard's company detail
// page. Same access model as GET /api/companies: any signed-in admin, gated
// only on a valid session token (shared directory, no per-row ownership).

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, user_id, company_name, email, mobile_number, contact_address, status, signup_source, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { user_id, ...company } = data;
  const { data: owner } = await supabaseAdmin.auth.admin.getUserById(user_id);
  return NextResponse.json({
    company: { ...company, email_verified: Boolean(owner?.user?.email_confirmed_at) },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => ({}));
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";
  const contactAddress =
    typeof body.contactAddress === "string" && body.contactAddress.trim()
      ? body.contactAddress.trim()
      : null;

  if (!companyName || !mobileNumber) {
    return NextResponse.json(
      { error: "company_name and mobile_number are required" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("companies")
    .update({
      company_name: companyName,
      mobile_number: mobileNumber,
      contact_address: contactAddress,
    })
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
