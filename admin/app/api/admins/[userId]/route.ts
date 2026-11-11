import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

// DELETE — revoke someone's admin access and delete their account. Admins
// can't remove themselves (so the last admin can never lock everyone out).
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin(req.headers.get("authorization"));
  if ("response" in auth) return auth.response;

  if (params.userId === auth.user.id) {
    return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: target } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", params.userId)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  // Deleting the auth user cascades to the admins row (on delete cascade)
  // and invalidates their sessions.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(params.userId);
  if (error) {
    console.error("delete admin failed", error.message);
    return NextResponse.json({ error: "Couldn't remove that admin." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
