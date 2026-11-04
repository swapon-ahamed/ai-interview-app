import { createClient } from "@supabase/supabase-js";

// Browser client — used for admin auth (signup/signin/session). Anon key only.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(url, key);

// Service-role client — full DB + auth-admin access. ONLY import this in
// server-side code (API routes). Never import this in a "use client" file.
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Verifies a "Bearer <token>" Authorization header against Supabase Auth and
// returns the user it belongs to, or null. Used by API routes that any
// signed-in admin may call (company listing/detail/edit).
export async function getAuthenticatedUser(authHeader: string | null) {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
