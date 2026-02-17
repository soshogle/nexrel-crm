import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/elevenlabs/signed-url?agentId=xxx&page_context=...&...
 * Fetches signed WebSocket URL - connects to api.elevenlabs.io (NOT LiveKit).
 * Supports dynamic variables as query params (e.g. page_context, selected_listing).
 */
export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId");
    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const params = new URLSearchParams({ agent_id: agentId });
    // Forward dynamic variables (page_context, selected_listing, etc.)
    for (const [key, value] of request.nextUrl.searchParams) {
      if (key !== "agentId" && value) params.append(key, value);
    }

    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText || "Failed to get signed URL" }, { status: 500 });
    }

    const data = await response.json();
    const signedUrl = data.signed_url;
    if (!signedUrl) {
      return NextResponse.json({ error: "No signed_url in response" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error("Error getting ElevenLabs signed URL:", error);
    return NextResponse.json({ error: "Failed to get signed URL" }, { status: 500 });
  }
}
