import { RoomAgentDispatch, RoomServiceClient } from "livekit-server-sdk";

// Server-only. Creates an interview room AND explicitly dispatches this
// environment's AI agent into it.
//
// Development and production share one LiveKit Cloud project, so the agent
// can't use LiveKit's automatic dispatch (every worker would be offered every
// room, and a local dev agent could pick up — or steal — production
// interviews). Instead each agent registers under a name
// (agent/main.py: WORKER_NAME, "ai-interviewer-dev" / "ai-interviewer-prod")
// and the web app asks for that name here, from LIVEKIT_AGENT_NAME
// (web/.env.development / web/.env.production).
export async function createInterviewRoom(
  roomName: string,
  metadata: Record<string, unknown>,
  options: { emptyTimeout?: number; maxParticipants?: number } = {}
) {
  const agentName = process.env.LIVEKIT_AGENT_NAME;
  if (!agentName) {
    throw new Error("LIVEKIT_AGENT_NAME is not set — no agent would join this room.");
  }

  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!.replace("wss://", "https://"),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  const json = JSON.stringify(metadata);
  return roomService.createRoom({
    name: roomName,
    // The agent reads its interview plan from room metadata (see CLAUDE.md).
    metadata: json,
    agents: [new RoomAgentDispatch({ agentName, metadata: json })],
    ...options,
  });
}
