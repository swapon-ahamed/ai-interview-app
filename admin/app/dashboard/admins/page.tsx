"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Admin = {
  user_id: string;
  email: string;
  created_at: string;
  accepted: boolean;
  isYou: boolean;
};

// Admin accounts are invite-only: this page is the only way new admins are
// created (POST /api/admins sends a Supabase invite email).
export default function AdminsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const load = useCallback(async (accessToken: string) => {
    setLoading(true);
    const res = await fetch("/api/admins", { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't load admins.");
      return;
    }
    setAdmins(data.admins ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setToken(session.access_token);
      load(session.access_token);
    });
  }, [router, load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!token || inviting) return;
    setInviteMsg(null);
    setError(null);
    setInviting(true);
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json().catch(() => ({}));
    setInviting(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't send the invite.");
      return;
    }
    setInviteMsg(`Invite sent to ${inviteEmail.trim()}. They'll appear as "Invite pending" until they accept it.`);
    setInviteEmail("");
    load(token);
  }

  async function remove(userId: string) {
    if (!token) return;
    setRemovingId(userId);
    setError(null);
    const res = await fetch(`/api/admins/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    setRemovingId(null);
    setConfirmRemoveId(null);
    if (!res.ok) {
      setError(data.error ?? "Couldn't remove that admin.");
      return;
    }
    load(token);
  }

  if (!token) return null;

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1>Admins</h1>
      <p style={{ color: "#666", lineHeight: 1.6 }}>
        Admin accounts are invite-only. Invited admins verify their email and choose their own
        password from the invite link.
      </p>

      <form onSubmit={invite} style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
        <input
          type="email"
          required
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="new.admin@yourcompany.com"
          style={{ flex: "1 1 260px", padding: 8 }}
        />
        <button type="submit" disabled={inviting} style={{ padding: "8px 16px" }}>
          {inviting ? "Sending…" : "Invite admin"}
        </button>
      </form>

      {inviteMsg && <p style={{ color: "#1e7e34", marginTop: 12 }}>{inviteMsg}</p>}
      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      <div style={{ marginTop: 32 }}>
        {loading ? (
          <p style={{ color: "#888" }}>Loading…</p>
        ) : (
          admins.map((a) => (
            <div
              key={a.user_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid #eee",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, wordBreak: "break-all" }}>
                  {a.email} {a.isYou && <span style={{ color: "#888", fontWeight: 400 }}>(you)</span>}
                </div>
                <div style={{ fontSize: 13, color: a.accepted ? "#1e7e34" : "#a15c00", marginTop: 2 }}>
                  {a.accepted ? "Active" : "Invite pending"} · added{" "}
                  {new Date(a.created_at).toLocaleDateString()}
                </div>
              </div>
              {!a.isYou &&
                (confirmRemoveId === a.user_id ? (
                  <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                    Remove and delete this account?
                    <button onClick={() => remove(a.user_id)} disabled={removingId === a.user_id} style={{ padding: "4px 10px", color: "crimson" }}>
                      {removingId === a.user_id ? "Removing…" : "Yes, remove"}
                    </button>
                    <button onClick={() => setConfirmRemoveId(null)} style={{ padding: "4px 10px" }}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmRemoveId(a.user_id)} style={{ padding: "4px 10px" }}>
                    Remove
                  </button>
                ))}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
