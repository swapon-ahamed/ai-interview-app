import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

// Called from /dashboard/register by a signed-in admin. Creates the company's
// Supabase Auth account and its companies row in one step, entirely
// server-side (service role) — no confirmation email is sent (email_confirm:
// true), so the company can sign in as soon as an admin activates them
// (see /api/companies/[id]/status), with no email step in between.
export async function POST(req: NextRequest) {
  const admin = await getAuthenticatedUser(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
  }

  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";
  const contactAddress =
    typeof body.contactAddress === "string" && body.contactAddress.trim()
      ? body.contactAddress.trim()
      : null;

  if (!email || !password || !companyName || !mobileNumber) {
    return NextResponse.json(
      { error: "email, password, companyName and mobileNumber are required" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pre-confirmed — no verification email is sent
    user_metadata: {
      company_name: companyName,
      mobile_number: mobileNumber,
      contact_address: contactAddress,
    },
  });

  if (createError || !userData?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create company account" },
      { status: 400 }
    );
  }

  const { data: company, error: insertError } = await supabaseAdmin
    .from("companies")
    .insert({
      user_id: userData.user.id,
      email,
      company_name: companyName,
      mobile_number: mobileNumber,
      contact_address: contactAddress,
      status: "pending",
    })
    .select("id, company_name, email, mobile_number, contact_address, status, created_at")
    .single();

  if (insertError) {
    // The auth user was created but the companies row failed — clean up so a
    // retry with the same email doesn't hit "email already registered".
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company });
}
