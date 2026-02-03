import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();
    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const baseUrl = "https://api.elevenlabs.io/v1/convai/conversation/token";
    const headers = {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    let response = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ agent_id: agentId }),
    });

    if (response.status === 405) {
      response = await fetch(`${baseUrl}?agent_id=${encodeURIComponent(agentId)}`, {
        method: "GET",
        headers,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText || "Failed to get token" }, { status: 500 });
    }

    const body = await response.json();
    return NextResponse.json({ token: body.token });
  } catch (error) {
    console.error("Error getting ElevenLabs token:", error);
    return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
  }
}
