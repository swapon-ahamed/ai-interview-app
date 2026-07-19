"""
AI Interviewer Agent
---------------------
Joins a LiveKit room as an invisible participant and conducts a voice interview:
listens (STT) -> decides next question (LLM) -> speaks (TTS).

The job role and question plan are NOT hardcoded anymore — they're read from the
room's metadata, which the web app sets when it creates the interview
(web/app/api/interviews/route.ts). The final transcript is saved to Supabase
instead of a local /tmp file.

NOTE: The LiveKit Agents framework changes fairly often. If imports below don't
match your installed version, check https://docs.livekit.io/agents/ for your
version and adjust.

Run with:  python main.py dev
"""

import asyncio
import json
import logging
import os

from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.plugins import openai, silero
from openai import OpenAI as OpenAIClient
from supabase import create_client

# Load .env from the project root, relative to this file's location — this works
# no matter what directory you run `python main.py` from.
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

if not os.environ.get("LIVEKIT_URL"):
    raise RuntimeError(
        f"LIVEKIT_URL not found. Checked for a .env file at: {ENV_PATH}\n"
        f"Make sure that file exists and contains LIVEKIT_URL=wss://your-project.livekit.cloud"
    )

logger = logging.getLogger("interview-agent")

DEFAULT_QUESTIONS = [
    "Ask the candidate to briefly introduce themselves and their background.",
    "Ask one general conceptual question relevant to their role.",
    "Ask a behavioral question about handling disagreement with a teammate.",
    "Thank the candidate and let them know the interview is complete.",
]


AGENT_NAME = "Maya"


def build_system_prompt(job_role: str, questions: list[str], duration_minutes: int) -> str:
    return f"""You are Maya, an AI interviewer conducting a live voice interview for a
{job_role} position. Introduce yourself by name once at the very start ("Hi, I'm Maya"),
then be warm, professional, and concise — this is a spoken conversation, not a written one,
so keep your turns short (2-3 sentences max unless asking a full question).

You have approximately {duration_minutes} minute(s) total for this interview. Pace yourself
accordingly — with very little time, ask only the single most important question and keep
everything brief; with more time, move through the plan at a natural conversational pace.

Follow this interview plan in order, moving to the next item once the current one has been
reasonably answered. Ask natural, brief follow-up questions when an answer is vague or
interesting, but don't get stuck — keep the interview moving.

Plan:
{chr(10).join(f"{i+1}. {step}" for i, step in enumerate(questions))}

When the plan is complete, thank the candidate, tell them next steps will be shared by the
recruiting team, and say goodbye.
"""


class InterviewerAgent(Agent):
    def __init__(self, system_prompt: str) -> None:
        super().__init__(instructions=system_prompt)


def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — transcript won't be saved")
        return None
    return create_client(url, key)


SCORING_PROMPT = """You are an experienced technical recruiter reviewing an interview
transcript for a {job_role} position. Score the candidate on a 1-5 scale (5 = excellent)
across these categories, based ONLY on what's in the transcript below. If the transcript
is too short or empty to judge fairly, score conservatively (2-3) and say so in the summary.

Respond with ONLY valid JSON, no markdown formatting, matching exactly this shape:
{{
  "overall_score": <1-5 integer>,
  "communication": <1-5 integer>,
  "technical_depth": <1-5 integer>,
  "problem_solving": <1-5 integer>,
  "culture_fit": <1-5 integer>,
  "summary": "<2-3 sentence summary of the candidate's performance>",
  "recommendation": "<one of: Strong yes, Yes, Maybe, No>"
}}

Transcript:
{transcript_text}
"""


def score_interview(job_role: str, transcript: list[dict]) -> dict | None:
    """Runs a one-off (non-realtime) OpenAI call to score the transcript. Returns
    None if there's no OpenAI key or the transcript is empty."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or not transcript:
        return None

    transcript_text = "\n".join(
        f"{'Interviewer' if t['role'] == 'assistant' else 'Candidate'}: {t['content']}"
        for t in transcript
    )

    client = OpenAIClient(api_key=api_key)
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": SCORING_PROMPT.format(
                        job_role=job_role, transcript_text=transcript_text
                    ),
                }
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Scoring call failed: {e}")
        return None


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    logger.info(f"Agent joined room: {ctx.room.name}")

    # --- Read job role / questions / interview id from room metadata ---
    metadata = {}
    if ctx.room.metadata:
        try:
            metadata = json.loads(ctx.room.metadata)
        except json.JSONDecodeError:
            logger.warning("Room metadata was not valid JSON, using defaults")

    job_role = metadata.get("jobRole", "General")
    questions = metadata.get("questions") or DEFAULT_QUESTIONS
    interview_id = metadata.get("interviewId")
    duration_minutes = metadata.get("durationMinutes", 2)

    system_prompt = build_system_prompt(job_role, questions, duration_minutes)

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=openai.STT(model="gpt-4o-mini-transcribe"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(model="gpt-4o-mini-tts", voice="nova"),
    )

    transcript: list[dict] = []

    @session.on("conversation_item_added")
    def _on_item(event):
        transcript.append({"role": event.item.role, "content": event.item.text_content})

    supabase = get_supabase()

    async def on_shutdown():
        score = score_interview(job_role, transcript)

        if supabase and interview_id:
            try:
                supabase.table("interviews").update(
                    {
                        "transcript": transcript,
                        "score": score,
                        "status": "completed",
                        "completed_at": "now()",
                    }
                ).eq("id", interview_id).execute()
                logger.info(f"Saved transcript + score to Supabase for interview {interview_id}")
            except Exception as e:
                logger.error(f"Failed to save transcript to Supabase: {e}")
        else:
            # Fallback so you don't lose data if Supabase isn't configured yet
            out_path = f"/tmp/transcript_{ctx.room.name}.json"
            with open(out_path, "w") as f:
                json.dump({"transcript": transcript, "score": score}, f, indent=2)
            logger.info(f"Supabase not configured — saved transcript locally to {out_path}")

    ctx.add_shutdown_callback(on_shutdown)

    if supabase and interview_id:
        supabase.table("interviews").update({"status": "in_progress"}).eq(
            "id", interview_id
        ).execute()

    await session.start(agent=InterviewerAgent(system_prompt), room=ctx.room)

    await session.generate_reply(
        instructions="Greet the candidate warmly and start the interview per the plan."
    )

    # --- Enforce the hard session duration ---
    async def enforce_duration():
        await asyncio.sleep(duration_minutes * 60)
        try:
            await session.generate_reply(
                instructions="Time is up. Immediately and politely wrap up the interview in "
                "one short sentence, thank the candidate, and say goodbye — do not ask "
                "anything else."
            )
            await asyncio.sleep(6)  # let the goodbye message finish playing
        finally:
            await ctx.room.disconnect()

    duration_task = asyncio.create_task(enforce_duration())

    async def cancel_duration_timer():
        duration_task.cancel()

    ctx.add_shutdown_callback(cancel_duration_timer)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
