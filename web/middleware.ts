import { NextRequest, NextResponse } from "next/server";

// First line of defence against request floods on /api/*: a cheap in-memory,
// per-IP sliding-window limiter plus a payload size guard, applied before
// any route handler (and therefore any Supabase / LiveKit / OpenAI work) runs.
//
// Scope and limits of this layer — read before relying on it:
//   - Counters live in this server instance's memory. With several instances
//     each enforces its own limit, and a restart resets them. The expensive
//     endpoint (POST /api/practice) is additionally limited in the database
//     (web/lib/rateLimit.ts), which IS shared across instances.
//   - It can't stop a volumetric DDoS that saturates the network before
//     requests reach Node. That needs an edge/CDN layer in front of the app
//     (Cloudflare, Vercel Firewall, AWS WAF / Shield, ...).

type Rule = { match: (req: NextRequest) => boolean; name: string; max: number; windowMs: number };

const MINUTE = 60_000;

// First matching rule wins; keep the most specific first.
const RULES: Rule[] = [
  {
    name: "practice-start",
    match: (r) => r.method === "POST" && r.nextUrl.pathname === "/api/practice",
    max: 10,
    windowMs: MINUTE,
  },
  {
    name: "practice-results",
    match: (r) => r.nextUrl.pathname.startsWith("/api/practice/"),
    max: 60, // results page polls every few seconds
    windowMs: MINUTE,
  },
  { name: "token", match: (r) => r.nextUrl.pathname === "/api/token", max: 20, windowMs: MINUTE },
  {
    name: "company-signup",
    match: (r) => r.method === "POST" && r.nextUrl.pathname === "/api/company-signup",
    max: 5,
    windowMs: MINUTE,
  },
  {
    name: "demo-requests",
    match: (r) => r.method === "POST" && r.nextUrl.pathname === "/api/demo-requests",
    max: 5,
    windowMs: MINUTE,
  },
  { name: "api", match: () => true, max: 120, windowMs: MINUTE },
];

const MAX_API_BODY_BYTES = 64 * 1024;

// key -> recent request timestamps (ms). Bounded so a flood of distinct
// (possibly spoofed) IPs can't exhaust memory.
const hits = new Map<string, number[]>();
const MAX_KEYS = 20_000;

function prune(now: number) {
  for (const [key, times] of hits) {
    if (!times.length || now - times[times.length - 1] > 10 * MINUTE) hits.delete(key);
  }
  if (hits.size > MAX_KEYS) hits.clear();
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip")?.trim() || req.ip || "unknown";
}

export function middleware(req: NextRequest) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_API_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  const rule = RULES.find((r) => r.match(req))!;
  const now = Date.now();
  if (hits.size > MAX_KEYS) prune(now);

  const key = `${rule.name}:${clientIp(req)}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);

  if (recent.length >= rule.max) {
    hits.set(key, recent);
    const retryAfter = Math.max(1, Math.ceil((rule.windowMs - (now - recent[0])) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly.", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  recent.push(now);
  hits.set(key, recent);
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
