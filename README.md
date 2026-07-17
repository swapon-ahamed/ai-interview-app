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

- **web/** — Next.js app. Candidate joins an interview room in the browser (audio/video via LiveKit).
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
1. Recruiter opens the web app home page, enters candidate name + job role, clicks
   "Create Interview Link". This calls `/api/interviews`, which saves a row in
   Supabase and creates the LiveKit room with that job role/questions attached as
   room metadata.
2. Recruiter sends the generated link to the candidate.
3. Candidate opens the link (`/interview/[roomName]`), which mints a LiveKit token
   and joins the room.
4. The Python agent auto-joins the same room, reads the job role/questions from
   room metadata, and conducts the interview accordingly.
5. When the interview ends, the agent saves the full transcript back to the
   `interviews` row in Supabase.

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

## Build steps (we'll do these one at a time)
- [x] Step 1: project scaffold
- [x] Step 2: agent voice pipeline + dynamic interview question logic (via room metadata)
- [x] Step 3: token API + candidate join UI
- [x] Step 4: transcript capture + storage (Supabase)
- [x] Step 5: question templates + scoring/evaluation pass
- [x] Step 6: recruiter dashboard (list interviews, view reports)
- [ ] Step 7 (optional/future): auth so only logged-in recruiters can create/view interviews;
      candidate recording playback; PDF export of the report
