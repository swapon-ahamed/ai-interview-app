"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

const linkStyle: React.CSSProperties = {
  color: "#c4c4d1",
  textDecoration: "none",
  fontSize: 14,
};

// One single header, used on every page (rendered once in app/layout.tsx) —
// sticky so it stays pinned while the page scrolls. Section links (#product
// etc.) are absolute to "/" since they only exist on the home page; clicking
// one from elsewhere navigates home and jumps to that section.
export default function NavBar() {
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
    router.push("/");
  }

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 32px",
        borderBottom: "1px solid #24242f",
        fontFamily: "sans-serif",
        background: "#0b0b12",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo dark />
      </Link>

      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/#product" style={linkStyle}>
          Product
        </Link>
        <Link href="/practice" style={linkStyle}>
          Free practice
        </Link>
        <Link href="/live-interview" style={linkStyle}>
          Live demo
        </Link>
        <Link href="/#pricing" style={linkStyle}>
          Pricing
        </Link>

        {session ? (
          <>
            <Link href="/dashboard" style={linkStyle}>
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                background: "transparent",
                border: "1px solid #26262f",
                color: "#fff",
                borderRadius: 6,
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/signin" style={linkStyle}>
            Sign in
          </Link>
        )}

        <Link
          href="/book-demo"
          style={{
            ...linkStyle,
            color: "#fff",
            border: "1px solid #4c3fc9",
            padding: "8px 16px",
            borderRadius: 6,
          }}
        >
          Book a demo
        </Link>

        <a
          href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"}
          style={{ color: "#6b6b78", fontSize: 13, textDecoration: "none" }}
        >
          Admin →
        </a>
      </div>
    </nav>
  );
}
