---
noteId: "8978b97081ff11f192c3cb988b8ff2ac"
tags: []

---

# AI Interview Platform (micro1-style) — MVP

## Architecture

```
candidate browser  <-->  LiveKit Cloud room  <-->  Python AI Agent (STT -> LLM -> TTS)
       |                                                    |
   Next.js app  <---- LiveKit token API ---->        OpenAI APIs
       |
   Supabase (Postgres) — interviews, transcripts, scores
```

- **web/** — Next.js app. Public welcome page + company sign-in; signed-in companies create
  interviews and view reports from `/dashboard`. Candidates join the interview room in the
  browser (audio/video via LiveKit) via the link a company sends them — no login required.
- **admin/** — Next.js app (separate, port 3001). Internal admin login; admins register company
  accounts (`/dashboard/register`) and manage them from a shared companies directory
  (`/dashboard`). See `admin/README.md`.
- **agent/** — Python worker using the LiveKit Agents framework. It joins the same room as an
  invisible "participant", listens to the candidate, transcribes, generates the next question
  with an LLM, and speaks it back (TTS) — this is the actual interviewer.

## Why this stack
- LiveKit handles all real-time audio/video transport (WebRTC) — you don't build that yourself.
- LiveKit's Agents framework has built-in OpenAI plugins for STT/LLM/TTS with turn-detection,
  interruption handling, etc. already solved.
- Everything else (Next.js, Supabase) is standard, cheap, well-documented tooling.

## Prerequisites (accounts you need — DO NOT paste keys into chat, only put them in `.env`)
1. LiveKit Cloud account (free tier) → get `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
2. OpenAI API key → `OPENAI_API_KEY`
3. Supabase project (free tier, https://supabase.com) →
   - Create a project
   - Go to SQL Editor → paste contents of `supabase/schema.sql` → Run
   - Go to Settings → API → copy `Project URL` (→ `SUPABASE_URL`) and the
     `service_role` secret key (→ `SUPABASE_SERVICE_ROLE_KEY`, NOT the anon key —
     the agent and API routes need full write access)

## How an interview works now
1. An admin registers the company from `admin/dashboard/register` (email, password,
   company name, mobile number, contact address). No verification email is sent —
   the account is created and confirmed immediately, but starts with moderation
   status `pending`, so the company can't sign in yet.
2. An admin activates the company (Pending → Active) — a one-click "Activate"
   button on the `admin/dashboard` companies grid, or from
   `admin/dashboard/companies/[id]`. Until then, signing in at `web/signin` is
   rejected with a "pending admin approval" message. Once active, the company
   signs in and lands on `/dashboard`.
3. From there, "+ New Interview" (`/dashboard/create-interview`) collects candidate name + job role,
   clicks "Create Interview Link". This calls `/api/interviews` (now requires the company's
   session), which saves a row in Supabase — tagged with that company's `user_id` — and
   creates the LiveKit room with the job role/questions attached as room metadata.
4. The company sends the generated link to the candidate.
5. Candidate opens the link (`/interview/[roomName]`), which mints a LiveKit token
   and joins the room — no login needed.
6. The Python agent auto-joins the same room, reads the job role/questions from
   room metadata, and conducts the interview accordingly.
7. When the interview ends, the agent saves the full transcript back to the
   `interviews` row in Supabase. The company sees it (and its report) back on
   their `/dashboard`, scoped to only their own interviews.

## Setup (run locally — this sandbox has no internet access to test live APIs)

### 1. Agent (Python)
```bash
cd agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # fill in real values in .env
python main.py dev
```

### 2. Web (Next.js)
```bash
cd web
npm install
npm run dev
```

### 3. Admin (Next.js, separate app — see `admin/README.md`)
```bash
cd admin
npm install
npm run dev   # port 3001
```

## Build steps (we'll do these one at a time)
- [x] Step 1: project scaffold
- [x] Step 2: agent voice pipeline + dynamic interview question logic (via room metadata)
- [x] Step 3: token API + candidate join UI
- [x] Step 4: transcript capture + storage (Supabase)
- [x] Step 5: question templates + scoring/evaluation pass
- [x] Step 6: recruiter dashboard (list interviews, view reports)
- [x] Step 7: `admin/` app (admin login, company registration, company directory);
      `web/` company login gating interview creation/reports, scoped per company
- [ ] Step 8 (optional/future): candidate recording playback; PDF export of the report;
      real `role` distinction between admin and company accounts
