import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public diagnostic endpoint for the landing page voice agent.
 * Does NOT expose secrets - only indicates whether configuration is ready.
 * Use: GET /api/elevenlabs/landing-status
 */
export async function GET() {
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
  const demoAgentId =
    process.env.NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID ||
    "agent_0301kap49d2afq5vp04v0r6p5k6q";
  const homeAgentId =
    process.env.NEXT_PUBLIC_ELEVENLABS_HOME_AGENT_ID ||
    "agent_3901k9zczeavedss273jfg525gnb";

  const ready = hasApiKey;
  const message = hasApiKey
    ? "Voice agent is configured. No phone number required."
    : "ELEVENLABS_API_KEY is not set. Add it to your deployment environment (e.g. Vercel).";

  return NextResponse.json({
    ready,
    hasApiKey,
    agentIdsConfigured: true,
    demoAgentId: demoAgentId ? "set" : "missing",
    homeAgentId: homeAgentId ? "set" : "missing",
    message,
    note: "Landing page voice agent uses browser WebRTC - no phone number needed.",
  });
}
