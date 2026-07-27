"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";

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
    <main style={{ maxWidth: 400, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Company Sign In</h1>

      <form onSubmit={handleSignin}>
        <label style={{ display: "block", marginTop: 16 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={{ width: "100%", padding: 8 }}
        />

        <label style={{ display: "block", marginTop: 16 }}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />

        {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: "8px 16px", marginTop: 20 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 14, color: "#888" }}>
        Don&apos;t have an account? Company accounts are created by an administrator — contact
        yours to get access.
      </p>
    </main>
  );
}
