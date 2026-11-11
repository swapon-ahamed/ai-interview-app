import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isValidEmail, requireAdmin, webAppUrl } from "@/lib/auth";

// Called from /dashboard/register by a signed-in admin. Invites the company:
// Supabase emails an invite link to the company's address; opening it
// verifies the email and lands on web/app/auth/set-password, where the
// company chooses its own password (the admin never knows it). The
// companies row is created 'pending' as before — the company can use the
// dashboard once it has accepted the invite AND an admin has activated it
// (activation requires a verified email — see ./companies/[id]/status).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => ({}));
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const email = str(body.email, 254).toLowerCase();
  const companyName = str(body.companyName, 200);
  const mobileNumber = str(body.mobileNumber, 30);
  const contactAddress = str(body.contactAddress, 500) || null;

  if (!companyName || !mobileNumber) {
    return NextResponse.json(
      { error: "Company name and mobile number are required." },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${webAppUrl()}/auth/set-password`,
      data: {
        account_type: "company",
        company_name: companyName,
        mobile_number: mobileNumber,
        contact_address: contactAddress,
      },
    }
  );

  if (inviteError || !userData?.user) {
    const msg = /already been registered|already registered|exists/i.test(inviteError?.message ?? "")
      ? "That email already has an account."
      : inviteError?.message ?? "Failed to send the company invite.";
    return NextResponse.json({ error: msg }, { status: 400 });
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
      signup_source: "admin_invite",
    })
    .select("id, company_name, email, mobile_number, contact_address, status, created_at")
    .single();

  if (insertError) {
    // The auth user was created but the companies row failed — clean up so a
    // retry with the same email doesn't hit "email already registered".
    console.error("companies insert failed", insertError.message);
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    return NextResponse.json({ error: "Failed to register the company." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company });
}
