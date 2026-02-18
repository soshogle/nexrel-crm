import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getEasternDateTime,
  getEasternDay,
  EASTERN_TIMEZONE,
} from "@/lib/voice-time-context";
import { getLanguageLabel } from "@/lib/voice-languages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/elevenlabs/signed-url?agentId=xxx&page_context=...&...
 * Fetches signed WebSocket URL - connects to api.elevenlabs.io (NOT LiveKit).
 * Injects current_datetime, current_day, timezone (Eastern) and preferred_language for multilingual agents.
 * Also forwards any other dynamic variables from query params.
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

    // Always inject Eastern time variables for {{current_datetime}}, {{current_day}}, {{timezone}}
    params.set("current_datetime", getEasternDateTime());
    params.set("current_day", getEasternDay());
    params.set("timezone", EASTERN_TIMEZONE);

    // Inject preferred_language from logged-in user if not already provided (multilingual like landing page)
    if (!request.nextUrl.searchParams.get("preferred_language")) {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const { prisma } = await import("@/lib/db");
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { language: true },
        });
        if (user?.language) {
          params.set("preferred_language", getLanguageLabel(user.language));
        }
      }
    }

    // Forward other dynamic variables (page_context, selected_listing, preferred_language, etc.)
    for (const [key, value] of request.nextUrl.searchParams) {
      if (key !== "agentId" && value) params.set(key, value);
    }

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
