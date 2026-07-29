"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";

const page = {
  bg: "#0b0b12",
  surface: "#15151f",
  border: "#26262f",
  text: "#f5f5f7",
  muted: "#9a9aa8",
};

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninForm />
    </Suspense>
  );
}

function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("pending")
      ? "Your company account is pending admin approval. You'll be notified once it's activated."
      : null
  );

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Companies start 'pending' until an admin activates them (admin/dashboard).
    // No matching row (e.g. an admin account) is let through unaffected.
    const { data: company } = await supabase
      .from("companies")
      .select("status")
      .eq("user_id", data.user.id)
      .maybeSingle();

    setLoading(false);

    if (company && company.status !== "active") {
      await supabase.auth.signOut();
      setError(
        "Your company account is pending admin approval. You'll be notified once it's activated."
      );
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main style={{ background: page.bg, color: page.text, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontSize: 28 }}>Company Sign In</h1>

        <div style={{ background: page.surface, border: `1px solid ${page.border}`, borderRadius: 12, padding: 24, marginTop: 20 }}>
          <form onSubmit={handleSignin}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={inputStyle}
            />

            <label style={{ ...labelStyle, marginTop: 16 }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            {error && <p style={{ color: "#f87171", marginTop: 12, fontSize: 14 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "10px 0",
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ marginTop: 24, fontSize: 14, color: page.muted }}>
          Don&apos;t have an account? Company accounts are created by an administrator — contact
          yours to get access.
        </p>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#c4c4d1",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 6,
  border: "1px solid #26262f",
  background: "#0f0f16",
  color: "#f5f5f7",
  fontSize: 14,
  fontFamily: "inherit",
};
