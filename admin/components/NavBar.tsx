"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

const linkStyle = (active: boolean): React.CSSProperties => ({
  color: active ? "#000" : "#555",
  fontWeight: active ? 600 : 400,
  textDecoration: "none",
});

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  // Only show admin navigation once the server has confirmed this session
  // belongs to an admin (row in the `admins` table).
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Admin guard for every page (the NavBar is in the root layout): a signed-in
  // account that isn't an admin — e.g. a company — is signed out right away.
  // The API routes enforce the same rule server-side; this is just so the UI
  // never shows a half-broken dashboard to a non-admin.
  const accessToken = session?.access_token;
  // /auth/* pages (set-password) handle their own access check after the
  // password is saved.
  const onAuthPage = pathname.startsWith("/auth/");
  useEffect(() => {
    if (onAuthPage) return;
    if (!accessToken) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetch("/api/me", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          setIsAdmin(true);
        } else if (res.status === 401 || res.status === 403) {
          setIsAdmin(false);
          await supabase.auth.signOut();
          router.replace(res.status === 403 ? "/signin?denied=1" : "/signin");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, router, onAuthPage]);

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
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo />
      </Link>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {session && isAdmin ? (
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
            <Link
              href="/dashboard/templates"
              style={linkStyle(pathname.startsWith("/dashboard/templates"))}
            >
              Templates
            </Link>
            <Link href="/dashboard/admins" style={linkStyle(pathname === "/dashboard/admins")}>
              Admins
            </Link>
            <button
              onClick={handleSignOut}
              style={{ padding: "6px 12px", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </>
        ) : session ? null : (
          <Link href="/signin" style={linkStyle(pathname === "/signin")}>
            Sign In
          </Link>
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
