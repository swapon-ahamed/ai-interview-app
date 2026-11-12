import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

// Lets the admin UI ask "is this session an admin?" right after sign-in and
// on each page load (see components/NavBar.tsx). The real enforcement is
// requireAdmin() on every API route; this just lets the UI sign non-admins
// out with a clear message instead of showing a broken dashboard.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;
  return NextResponse.json({ isAdmin: true, email: auth.user.email });
}
