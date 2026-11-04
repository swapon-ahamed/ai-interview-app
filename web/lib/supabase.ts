import { createClient } from "@supabase/supabase-js";

// Service-role client — full DB access. ONLY import this in server-side code
// (API routes, server components). Never import this in a "use client" file.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  return createClient(url, key);
}

// Browser client — used for company sign-in/session. Anon key only.
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!publicUrl || !publicKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(publicUrl, publicKey);

// Verifies a "Bearer <token>" Authorization header against Supabase Auth and
// returns the user it belongs to, or null. Used by API routes that scope data
// (interviews) to the signed-in company.
export async function getAuthenticatedUser(authHeader: string | null) {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
