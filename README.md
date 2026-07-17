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
3. Supabase project (free tier) → `SUPABASE_URL`, `SUPABASE_ANON_KEY` (added in step 4/5)

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
- [ ] Step 2: agent voice pipeline + interview question logic
- [ ] Step 3: token API + candidate join UI
- [ ] Step 4: transcript capture + storage (Supabase)
- [ ] Step 5: scoring/evaluation pass
- [ ] Step 6: recruiter dashboard
