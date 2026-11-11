// Password rules for sign-up / set-password, checked in the browser and again
// in /api/company-signup. Supabase Auth enforces its own minimum server-side
// (Authentication -> Sign In / Providers -> Email -> minimum password
// length); keep that at 8+ so the two agree. Duplicated in
// admin/lib/password.ts (no shared package between the apps).
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 72) return "Password must be at most 72 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must include a letter and a number.";
  return null;
}
