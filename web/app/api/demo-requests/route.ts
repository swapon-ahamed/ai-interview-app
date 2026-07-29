import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Public — the /book-demo page's lead-gen form. No auth, same reasoning as
// /api/practice: it's an open marketing form, not a company/candidate action.
export async function POST(req: NextRequest) {
  const body = await req.json();

  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
  const workEmail = typeof body.workEmail === "string" ? body.workEmail.trim().slice(0, 200) : "";
  const companyName = typeof body.companyName === "string" ? body.companyName.trim().slice(0, 200) : "";
  const rolesPerMonth = typeof body.rolesPerMonth === "string" ? body.rolesPerMonth : "";
  const rolesHiringFor =
    typeof body.rolesHiringFor === "string" && body.rolesHiringFor.trim()
      ? body.rolesHiringFor.trim().slice(0, 1000)
      : null;

  if (!fullName || !workEmail || !companyName || !rolesPerMonth) {
    return NextResponse.json(
      { error: "fullName, workEmail, companyName, and rolesPerMonth are required" },
      { status: 400 }
    );
  }

  const { error } = await getSupabaseAdmin().from("demo_requests").insert({
    full_name: fullName,
    work_email: workEmail,
    company_name: companyName,
    roles_per_month: rolesPerMonth,
    roles_hiring_for: rolesHiringFor,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
