import { NextResponse } from "next/server";
import { apiErrors } from '@/lib/api-error';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();
    if (!agentId) {
      return apiErrors.badRequest("Missing agentId");
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return apiErrors.internal("ElevenLabs API key not configured");
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
      return apiErrors.internal(errorText || "Failed to get token");
    }

    const body = await response.json();
    return NextResponse.json({ token: body.token });
  } catch (error) {
    console.error("Error getting ElevenLabs token:", error);
    return apiErrors.internal("Failed to get token");
  }
}
