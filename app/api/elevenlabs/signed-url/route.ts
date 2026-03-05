import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// CORS: restrict signed-url requests to the CRM domain and known soshogle.com subdomains.
// Wildcards would allow any origin to obtain a signed ElevenLabs agent token.
function buildCorsHeaders(origin: string | null) {
  const allowedBase = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || '';
  const allowedOrigins = [
    allowedBase,
    'https://soshogle.com',
    'https://www.soshogle.com',
  ].filter(Boolean);

  // Also allow *.soshogle.com subdomains (tenant websites)
  const isAllowed = origin
    ? allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.soshogle\.com$/.test(origin)
    : false;

  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : (allowedBase || '*'),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}


/**
 * GET /api/elevenlabs/signed-url?agentId=xxx
 * Fetches signed WebSocket URL - connects to api.elevenlabs.io (NOT LiveKit).
 * Dynamic variables are passed client-side via Conversation.startSession.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);
  try {
    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400, headers: corsHeaders });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Soshogle Voice API key not configured" }, { status: 500, headers: corsHeaders });
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
      console.error("[elevenlabs/signed-url] API error:", response.status);
      return NextResponse.json(
        { error: `Soshogle Voice API error ${response.status}` },
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
    console.error("Error getting ElevenLabs signed URL:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to get signed URL" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
}
