import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdmin } from "@/lib/supabase";

// Server-only (API routes). Never import from a "use client" file.

export type CompanyRow = { id: string; status: string; company_name: string };

// The gate for every company API route. Previously the "company must be
// active" rule lived only in the browser (signin/dashboard pages), so a
// pending company — or any account at all in the Supabase project, admins
// included — could call these APIs directly with its token. Now the server
// requires all three:
//   1. a valid session
//   2. a verified email
//   3. a companies row with status 'active' (approved by an admin)
//
//   const auth = await requireActiveCompany(req.headers.get("authorization"));
//   if ("response" in auth) return auth.response;
export async function requireActiveCompany(
  authHeader: string | null
): Promise<{ user: User; company: CompanyRow } | { response: NextResponse }> {
  const user = await getAuthenticatedUser(authHeader);
  if (!user) {
    return { response: NextResponse.json({ error: "Invalid or missing session" }, { status: 401 }) };
  }
  if (!user.email_confirmed_at) {
    return { response: NextResponse.json({ error: "Verify your email address first." }, { status: 403 }) };
  }

  const { data: company } = await getSupabaseAdmin()
    .from("companies")
    .select("id, status, company_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    return {
      response: NextResponse.json({ error: "This account isn't a company account." }, { status: 403 }),
    };
  }
  if (company.status !== "active") {
    return {
      response: NextResponse.json(
        { error: "Your company account is pending admin approval." },
        { status: 403 }
      ),
    };
  }
  return { user, company };
}

// This app's public URL, for links in auth emails. Must be listed under
// Supabase -> Authentication -> URL Configuration -> Redirect URLs.
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
