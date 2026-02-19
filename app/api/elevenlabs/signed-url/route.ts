import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// CORS: allow website templates (Theodora, etc.) to fetch signed URL directly — same flow as landing page
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * GET /api/elevenlabs/signed-url?agentId=xxx
 * Fetches signed WebSocket URL - connects to api.elevenlabs.io (NOT LiveKit).
 * Dynamic variables are passed client-side via Conversation.startSession.
 */
export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400, headers: corsHeaders });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500, headers: corsHeaders });
    }

    // ElevenLabs get-signed-url only accepts agent_id, include_conversation_id, branch_id.
    // Dynamic variables (current_datetime, etc.) are passed client-side via Conversation.startSession.
    const params = new URLSearchParams({ agent_id: agentId });
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[elevenlabs/signed-url] API error:", response.status, errorText);
      return NextResponse.json(
        { error: errorText || `ElevenLabs API error ${response.status}` },
        { status: 500, headers: corsHeaders }
      );
    }

    const data = await response.json();
    const signedUrl = data.signed_url;
    if (!signedUrl) {
      return NextResponse.json({ error: "No signed_url in response" }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ signedUrl }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error getting ElevenLabs signed URL:", error);
    return NextResponse.json({ error: "Failed to get signed URL" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
