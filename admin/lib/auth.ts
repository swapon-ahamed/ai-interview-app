import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

// Server-only (API routes). Never import from a "use client" file.

// The gate for every admin API route: a valid session AND a row in the
// `admins` table (see supabase/schema.sql). Being signed in is not enough —
// company accounts live in the same Supabase project. Returns the user, or a
// ready-made 401/403 response to return as-is:
//
//   const auth = await requireAdmin(req.headers.get("authorization"));
//   if ("response" in auth) return auth.response;
export async function requireAdmin(
  authHeader: string | null
): Promise<{ user: User } | { response: NextResponse }> {
  const user = await getAuthenticatedUser(authHeader);
  if (!user) {
    return { response: NextResponse.json({ error: "Invalid or missing session" }, { status: 401 }) };
  }

  const { data: admin, error } = await getSupabaseAdmin()
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !admin) {
    return {
      response: NextResponse.json({ error: "This account doesn't have admin access." }, { status: 403 }),
    };
  }
  return { user };
}

// Where auth emails (invites, password resets) should send people back to.
// Must be listed under Supabase -> Authentication -> URL Configuration ->
// Redirect URLs, or Supabase falls back to the project's Site URL.
export function adminAppUrl(req: Request): string {
  return (process.env.NEXT_PUBLIC_ADMIN_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export function webAppUrl(): string {
  return (process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000").replace(/\/$/, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

// user_id -> whether that auth user has verified their email. Pages through
// Supabase Auth's user list (1000 per page); fine at this app's scale.
export async function emailVerifiedByUserId(): Promise<Map<string, boolean>> {
  const supabaseAdmin = getSupabaseAdmin();
  const map = new Map<string, boolean>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const u of data.users) map.set(u.id, Boolean(u.email_confirmed_at));
    if (data.users.length < 1000) break;
  }
  return map;
}
