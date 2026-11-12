"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// For pages that emailed auth links land on (/auth/confirmed,
// /auth/set-password). Supabase appends a short-lived session to the URL
// fragment, which supabase-js consumes automatically (detectSessionInUrl).
// Expired or already-used links instead come back as
// #error=...&error_description=..., which we surface as "invalid".
export function useLinkSession() {
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("error")) {
      setLinkError(hash.get("error_description")?.replace(/\+/g, " ") ?? "This link is invalid.");
      setState("invalid");
      return;
    }

    let settled = false;
    const settle = (s: Session | null) => {
      if (settled) return;
      settled = true;
      setSession(s);
      setState(s ? "ready" : "invalid");
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s) settle(s);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => settle(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  return { state, session, linkError };
}

// 'active' | 'pending' | null (no companies row = not a company account).
export async function fetchCompanyStatus(userId: string): Promise<string | null> {
  const { data } = await supabase.from("companies").select("status").eq("user_id", userId).maybeSingle();
  return data?.status ?? null;
}
