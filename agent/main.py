"""
AI Interviewer Agent
---------------------
Joins a LiveKit room as an invisible participant and conducts a voice interview:
listens (STT) -> decides next question (LLM) -> speaks (TTS).

NOTE: The LiveKit Agents framework changes fairly often. Before running this,
check the current API against https://docs.livekit.io/agents/ — method names
below (AgentSession, Agent, etc.) reflect the framework as of early/mid 2026;
pin your installed version with `pip freeze | grep livekit` and diff against
the docs for that version if something doesn't import.

Run with:  python main.py dev
"""

import json
import logging
import os

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.plugins import openai, silero

load_dotenv(dotenv_path="../.env")

logger = logging.getLogger("interview-agent")

# ---------------------------------------------------------------------------
# Interview configuration — swap this out per job role. In step 3 this will
# come from the room metadata (set when the interview is created) instead of
# being hardcoded.
# ---------------------------------------------------------------------------
JOB_ROLE = "Backend Software Engineer"
INTERVIEW_PLAN = [
    "Ask the candidate to briefly introduce themselves and their background.",
    "Ask one conceptual question about REST API design.",
    "Ask one question about how they'd debug a production performance issue.",
    "Ask a behavioral question about handling disagreement with a teammate.",
    "Thank the candidate and let them know the interview is complete.",
]

SYSTEM_PROMPT = f"""You are an AI interviewer conducting a live voice interview for a
{JOB_ROLE} position. Be warm, professional, and concise — this is a spoken conversation,
not a written one, so keep your turns short (2-3 sentences max unless asking a full question).

Follow this interview plan in order, moving to the next item once the current one has been
reasonably answered. Ask natural, brief follow-up questions when an answer is vague or
interesting, but don't get stuck — keep the interview moving.

Plan:
{chr(10).join(f"{i+1}. {step}" for i, step in enumerate(INTERVIEW_PLAN))}

When the plan is complete, thank the candidate, tell them next steps will be shared by the
recruiting team, and say goodbye.
"""


class InterviewerAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    logger.info(f"Agent joined room: {ctx.room.name}")

    session = AgentSession(
        # Voice activity detection — decides when the candidate has stopped talking
        vad=silero.VAD.load(),
        # Speech-to-text
        stt=openai.STT(model="gpt-4o-mini-transcribe"),
        # The "brain" — generates the next question/response
        llm=openai.LLM(model="gpt-4o-mini"),
        # Text-to-speech
        tts=openai.TTS(model="gpt-4o-mini-tts", voice="alloy"),
    )

    # Collect the full transcript as the interview happens so we can score it later.
    transcript: list[dict] = []

    @session.on("conversation_item_added")
    def _on_item(event):
        transcript.append(
            {"role": event.item.role, "content": event.item.text_content}
        )

    async def on_shutdown():
        # Step 4 will replace this with a real Supabase write.
        out_path = f"/tmp/transcript_{ctx.room.name}.json"
        with open(out_path, "w") as f:
            json.dump(transcript, f, indent=2)
        logger.info(f"Saved transcript to {out_path}")

    ctx.add_shutdown_callback(on_shutdown)

    await session.start(agent=InterviewerAgent(), room=ctx.room)

    # Kick things off — the agent speaks first.
    await session.generate_reply(
        instructions="Greet the candidate warmly and start the interview per the plan."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
