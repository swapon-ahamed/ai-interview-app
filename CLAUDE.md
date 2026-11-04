# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An AI-conducted voice interview platform (micro1-style MVP): a company creates an interview link,
a candidate joins a browser call with no login, and a Python AI agent conducts the interview live
(STT → LLM → TTS) over LiveKit, then scores the transcript and saves it to Supabase.

```
candidate browser  <-->  LiveKit Cloud room  <-->  Python AI Agent (STT -> LLM -> TTS)
       |                                                    |
   Next.js app  <---- LiveKit token API ---->        OpenAI APIs
       |
   Supabase (Postgres) — interviews, transcripts, scores, companies
```

Three independently-run apps, no shared package/monorepo tooling between them:

- **`web/`** (Next.js, port 3000) — public site + company sign-in. Signed-in companies create
  interviews and view reports from `/dashboard`. Candidates join via `/interview/[roomName]` with
  no login.
- **`admin/`** (Next.js, port 3001) — internal admin login; admins register company accounts and
  activate/deactivate them from a shared companies directory. See `admin/README.md` for the full
  admin-side flow (account types, moderation, company registration lifecycle) — it's kept
  up to date there rather than duplicated here.
- **`agent/`** (Python, LiveKit Agents framework) — joins the interview room as an invisible
  participant: listens (STT), decides the next question (LLM), speaks (TTS), then scores the
  transcript and writes it back to Supabase on shutdown.

## Commands

### web/ and admin/ (Next.js)
```bash
cd web    # or: cd admin
npm install
npm run dev     # web on :3000, admin on :3001 (see package.json "dev" script)
npm run build
npm run start
```
No test suite or lint script is configured in either app currently.

### agent/ (Python)
```bash
cd agent
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py dev     # dev mode: connects to LiveKit and waits for a room to join
```
The agent loads `.env` from the **repo root**, not `agent/.env`, resolved relative to
`agent/main.py`'s own location — so it works regardless of cwd. There's no test suite here either.

### Database
Schema lives in `supabase/schema.sql`, applied by pasting into the Supabase dashboard's SQL
Editor (no migration tool). It's idempotent (`create table if not exists`, `add column if not
exists`), so re-running it after pulling schema changes is safe and expected — do this whenever
`schema.sql` changes.

## Environment variables

One root `.env` is shared by `agent/` and (implicitly) documents the values `web/.env.local` and
`admin/.env.local` also need — see `.env.example`, `web/.env.example`, `admin/.env.example` for the
exact per-app split. Key points that aren't obvious from the variable names alone:

- `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) is used server-side by `agent/` and by
  both apps' API routes for full-access writes/reads that bypass RLS — never expose it to the
  browser or import its client (`getSupabaseAdmin()`) from a `"use client"` file.
- `admin/` additionally needs `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` because it
  calls Supabase Auth directly from client components (sign in/up); `web/` only touches Supabase
  from server-side API routes except for one client-side lookup in `web/app/signin` (see below).
- Both apps read the other's URL for the top nav's cross-link (`NEXT_PUBLIC_ADMIN_URL` in `web/`,
  `NEXT_PUBLIC_WEB_URL` in `admin/`).

## Architecture notes worth knowing before changing code

**Auth model — no roles table.** There is no `role` column or permission distinction between
"admin" and "company" Supabase Auth users anywhere in this project. Whoever can sign in at
`admin/signin` is treated as a full admin; whoever can sign in at `web/signin` is treated as a
company, gated only by their `companies.status` row (see below). Anyone with any Supabase Auth
account in the shared project could sign into either app — see `admin/README.md`'s "Known
limitation" note before building anything that assumes real role separation.

**Company moderation gate.** New companies are created via `admin/`'s
`POST /api/register-company` (service-role, admin-only) with `companies.status = 'pending'`, and
confirmed immediately (`email_confirm: true`) so **no verification email is ever sent** — the only
gate is admin moderation. `web/app/signin/page.tsx` checks `companies.status` client-side right
after password auth succeeds and immediately signs the user back out if not `'active'`;
`web/app/dashboard` re-checks on every load so a revert to `'pending'` takes effect on next page
load, not just next login. If you touch sign-in/dashboard access control, both checks need to move
together — there's no server-side enforcement of this gate elsewhere.

**Room metadata is the handoff between `web/` and `agent/`.** `web/app/api/interviews/route.ts`
(POST) creates both the Supabase `interviews` row and the LiveKit room in the same request, and
writes `{ interviewId, jobRole, questions, durationMinutes }` as the room's `metadata` JSON. This
is the *only* channel `agent/main.py` uses to learn what interview it's conducting — it parses
`ctx.room.metadata` on join and falls back to `DEFAULT_QUESTIONS` if missing/invalid. If you add a
new per-interview setting the agent needs, it has to round-trip through this metadata blob, not a
separate DB read (the agent has its own Supabase client, but currently only uses it to write
results back, not read interview config).

**Interview scheduling window.** `interviews` rows carry `scheduled_start`/`scheduled_end`/
`duration_minutes`. `web/app/api/token/route.ts` enforces the start/end window before minting a
LiveKit join token (403 before start, 410 after end); `duration_minutes` is separately enforced
*inside* the agent process (`agent/main.py`'s `enforce_duration()`), which force-ends the
conversation and disconnects after that many minutes regardless of the room's scheduled window.
These are two different mechanisms for two different things — don't assume changing one affects
the other.

**Scoring is a separate, non-realtime LLM call.** The agent's live conversation model
(`openai.LLM` inside `AgentSession`) only drives the spoken interview. When the room shuts down,
`score_interview()` in `agent/main.py` makes a *separate* one-off `gpt-4o-mini` call with the full
transcript to produce the 1-5 rubric scores saved to `interviews.score`. Changing the interview's
conversational behavior (system prompt) and changing scoring behavior (`SCORING_PROMPT`) are
independent edits.

**Per-app Supabase client shape is duplicated, not shared.** Both `web/lib/supabase.ts` and
`admin/lib/supabase.ts` independently export the same three things — a browser `supabase` client
(anon key), `getSupabaseAdmin()` (service role, server-only), `getAuthenticatedUser(authHeader)`
(validates a `Bearer` token against Supabase Auth). There's no shared package; if you fix a bug or
add a helper in one, check whether the other needs the same change.

**Data scoping.** `interviews` rows are tagged with `user_id` (the company's Supabase Auth id) and
every `web/` API route that lists/reads interviews filters on it via `getAuthenticatedUser`. The
`companies` table has RLS restricting direct client reads to `auth.uid() = user_id`, but `admin/`'s
`GET /api/companies` deliberately bypasses that (service-role key) to return the full company
directory to any signed-in admin — a documented, intentional exception, not an oversight.
