import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { adminAppUrl, isValidEmail, requireAdmin } from "@/lib/auth";

// GET — list admins (for /dashboard/admins).
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("user_id, email, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("list admins failed", error.message);
    return NextResponse.json({ error: "Couldn't load admins." }, { status: 500 });
  }

  // Whether each admin has accepted their invite (= verified their email).
  const admins = await Promise.all(
    (data ?? []).map(async (a) => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(a.user_id);
      return {
        ...a,
        accepted: Boolean(u?.user?.email_confirmed_at),
        isYou: a.user_id === auth.user.id,
      };
    })
  );

  return NextResponse.json({ admins });
}

// POST { email } — invite a new admin. Admin accounts are invite-only: this
// is the only way one gets created. Supabase emails an invite link; opening
// it verifies the address and lands on /auth/set-password, where they choose
// their own password. The admins row is written up front, so the account
// has admin access as soon as the invite is accepted.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${adminAppUrl(req)}/auth/set-password`,
  });

  if (error || !data?.user) {
    // Most common: the email already belongs to an account (e.g. a company).
    // Deliberately not converting existing accounts into admins.
    const msg = /already been registered|already registered|exists/i.test(error?.message ?? "")
      ? "That email already has an account. Admin invites must go to an email with no existing account."
      : error?.message ?? "Couldn't send the invite.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: insertError } = await supabaseAdmin
    .from("admins")
    .insert({ user_id: data.user.id, email, invited_by: auth.user.id });

  if (insertError) {
    console.error("admins insert failed", insertError.message);
    // Don't leave an invited-but-powerless account behind.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "Couldn't create the admin invite." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
