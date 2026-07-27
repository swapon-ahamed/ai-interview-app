"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const linkStyle = (active: boolean): React.CSSProperties => ({
  color: active ? "#000" : "#555",
  fontWeight: active ? 600 : 400,
  textDecoration: "none",
});

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        borderBottom: "1px solid #eee",
        fontFamily: "sans-serif",
      }}
    >
      <Link href="/" style={{ fontWeight: 700, textDecoration: "none", color: "#000" }}>
        AI Interview Admin
      </Link>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {session ? (
          <>
            <Link href="/dashboard" style={linkStyle(pathname === "/dashboard")}>
              Dashboard
            </Link>
            <Link
              href="/dashboard/interviews"
              style={linkStyle(pathname === "/dashboard/interviews")}
            >
              Interviews
            </Link>
            <button
              onClick={handleSignOut}
              style={{ padding: "6px 12px", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/signin" style={linkStyle(pathname === "/signin")}>
              Sign In
            </Link>
            <Link href="/signup" style={linkStyle(pathname === "/signup")}>
              Sign Up
            </Link>
          </>
        )}

        <a
          href={process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}
          style={{ color: "#999", fontSize: 13, textDecoration: "none" }}
        >
          Web →
        </a>
      </div>
    </nav>
  );
}
