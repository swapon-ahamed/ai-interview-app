import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInterviewRoom } from "@/lib/livekit";
import { checkRateLimits, getClientIp, readJsonBody, tooManyRequests } from "@/lib/rateLimit";
import {
  PRACTICE_MAX_ATTEMPTS,
  normalizeEmail,
  normalizePhone,
  validatePracticeDetails,
} from "@/lib/practice";

// Public, no-auth counterpart to /api/interviews — starts a free self-serve
// practice session for anyone browsing /practice. Deliberately separate from
// the company flow rather than a branch inside it: no company session, no
// scheduling form, and the row it creates is tagged mode: "practice" so
// /api/practice/[roomName] can safely expose it back to the candidate without
// ever risking a real company interview's data.
//
// Every session costs LiveKit + OpenAI usage, so this is the endpoint abuse
// protection is concentrated on:
//   1. body size cap + strict validation (cheap, before any DB work)
//   2. honeypot field — bots that fill every input are silently rejected
//   3. DB-backed rate limits per IP and globally (shared across instances)
//   4. per-candidate attempt cap (PRACTICE_MAX_ATTEMPTS), per email and phone,
//      claimed atomically in Postgres so concurrent requests can't exceed it
// The in-memory per-IP limiter in middleware.ts sits in front of all of this.

const MAX_BODY_BYTES = 2048;

const IP_HOURLY_LIMIT = 5;
const IP_DAILY_LIMIT = 10;
// Hard ceiling on new practice sessions site-wide — the backstop against a
// distributed flood from many IPs. Tune via env without a deploy of code.
const GLOBAL_HOURLY_LIMIT = Number(process.env.PRACTICE_GLOBAL_HOURLY_LIMIT) || 300;

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  // Honeypot: a visually hidden input real users never fill.
  if (str(b.website).trim()) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const details = { fullName: str(b.fullName), email: str(b.email), phone: str(b.phone) };
  const templateId = str(b.templateId);
  const invalid = validatePracticeDetails(details);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(templateId)) {
    return NextResponse.json({ error: "Unknown practice role." }, { status: 400 });
  }

  const fullName = details.fullName.trim();
  const email = normalizeEmail(details.email);
  const phone = normalizePhone(details.phone);

  const ip = getClientIp(req);
  const limit = await checkRateLimits([
    { key: "practice:global", max: GLOBAL_HOURLY_LIMIT, windowSeconds: 3600 },
    { key: `practice:ip:${ip}:h`, max: IP_HOURLY_LIMIT, windowSeconds: 3600 },
    { key: `practice:ip:${ip}:d`, max: IP_DAILY_LIMIT, windowSeconds: 86400 },
  ]);
  if (!limit.ok) {
    return tooManyRequests(
      limit.rule.key === "practice:global"
        ? "Practice sessions are very busy right now. Please try again later."
        : "Too many practice sessions started from your network. Please try again later.",
      limit.retryAfterSeconds
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: template, error: templateError } = await supabase
    .from("question_templates")
    .select("role, questions, duration_minutes")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Unknown practice role." }, { status: 404 });
  }

  const { data: claim, error: claimError } = await supabase.rpc("claim_practice_attempt", {
    p_email: email,
    p_full_name: fullName,
    p_phone: phone,
    p_max: PRACTICE_MAX_ATTEMPTS,
  });
  if (claimError || !claim) {
    console.error("claim_practice_attempt failed", claimError?.message);
    return NextResponse.json({ error: "Couldn't start the practice session." }, { status: 500 });
  }
  if (!claim.ok) {
    return NextResponse.json(
      {
        error: `You've used all ${PRACTICE_MAX_ATTEMPTS} free practice attempts for this email or phone number.`,
        attemptsRemaining: 0,
      },
      { status: 403 }
    );
  }

  const candidateId: string = claim.candidate_id;
  const attemptNumber: number = claim.attempt_number;

  // Unguessable — the results endpoint is keyed by room name alone, so a
  // timestamp-based name would let anyone enumerate other people's results.
  const roomName = `practice-${randomUUID()}`;
  const now = new Date();
  // Just long enough to join and finish (plus slack for reconnects) — a
  // practice link isn't shared ahead of time, so there's no reason to keep it
  // joinable for hours.
  const end = new Date(now.getTime() + (template.duration_minutes + 15) * 60 * 1000);

  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      room_name: roomName,
      candidate_name: fullName,
      job_role: template.role,
      questions: template.questions,
      status: "created",
      scheduled_start: now.toISOString(),
      scheduled_end: end.toISOString(),
      duration_minutes: template.duration_minutes,
      mode: "practice",
      practice_candidate_id: candidateId,
      attempt_number: attemptNumber,
    })
    .select("id")
    .single();

  if (error || !interview) {
    console.error("practice interview insert failed", error?.message);
    await supabase.rpc("release_practice_attempt", { p_candidate_id: candidateId });
    return NextResponse.json({ error: "Couldn't start the practice session." }, { status: 500 });
  }

  try {
    await createInterviewRoom(
      roomName,
      {
        interviewId: interview.id,
        jobRole: template.role,
        questions: template.questions,
        durationMinutes: template.duration_minutes,
      },
      // Candidate + AI agent, with one spare slot for a reconnecting tab.
      { emptyTimeout: 10 * 60, maxParticipants: 3 }
    );
  } catch (e) {
    // The attempt never really happened — give it back.
    console.error("LiveKit createRoom failed", e);
    await supabase.from("interviews").delete().eq("id", interview.id);
    await supabase.rpc("release_practice_attempt", { p_candidate_id: candidateId });
    return NextResponse.json({ error: "Couldn't start the practice session." }, { status: 502 });
  }

  return NextResponse.json({
    roomName,
    interviewId: interview.id,
    attemptNumber,
    attemptsRemaining: claim.remaining,
    maxAttempts: PRACTICE_MAX_ATTEMPTS,
  });
}
