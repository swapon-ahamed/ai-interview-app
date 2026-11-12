import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Server-only. Database-backed fixed-window rate limiting (see hit_rate_limit()
// in supabase/schema.sql). Unlike the in-memory limiter in middleware.ts this
// is shared across every server instance, so use it for endpoints where each
// request costs real money (practice sessions spin up LiveKit + OpenAI).

export type LimitRule = { key: string; max: number; windowSeconds: number };

export type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; rule: LimitRule };

// Checks every rule (each records a hit) and fails on the first one exceeded.
// Fails CLOSED if the DB is unreachable — for a cost-bearing endpoint, briefly
// refusing service beats letting a flood through unmetered.
export async function checkRateLimits(rules: LimitRule[]): Promise<LimitResult> {
  const supabase = getSupabaseAdmin();
  for (const rule of rules) {
    const { data, error } = await supabase.rpc("hit_rate_limit", {
      p_key: rule.key,
      p_window_seconds: rule.windowSeconds,
    });
    if (error || !data) {
      console.error("rate limit check failed", rule.key, error?.message);
      return { ok: false, retryAfterSeconds: 30, rule };
    }
    if (data.count > rule.max) {
      const resetMs = new Date(data.reset_at).getTime() - Date.now();
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(resetMs / 1000)), rule };
    }
  }
  return { ok: true };
}

export function tooManyRequests(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: message, retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

// Best-effort client IP. Behind a reverse proxy / load balancer (Vercel,
// Nginx, Cloudflare, ALB) the first X-Forwarded-For entry is the client.
// If the app is ever exposed directly to the internet, X-Forwarded-For is
// client-controlled and per-IP limits can be dodged — the global caps still
// hold in that case.
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || req.ip || "unknown";
}

// Reads a JSON body with a hard size cap so a huge payload can't tie up the
// server parsing it. Returns null on oversize or invalid JSON.
export async function readJsonBody(req: NextRequest, maxBytes: number): Promise<unknown | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return null;
  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
