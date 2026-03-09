import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/calls/audio/[conversationId]
 * Proxy endpoint to fetch ElevenLabs audio with authentication
 * This allows the browser to play audio without needing API keys
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { conversationId } = params;

    // Verify that this call/conversation belongs to the user
    // Check CallLog (for voice agents) and DocpenConversation (for Docpen)
    const callLog = await db.callLog.findFirst({
      where: {
        OR: [
          { elevenLabsConversationId: conversationId },
          { twilioCallSid: conversationId },
        ],
        userId: session.user.id,
      },
    });

    // If not found in CallLog, check DocpenConversation
    let isAuthorized = !!callLog;
    if (!isAuthorized) {
      // Check if this conversation belongs to one of the user's Docpen agents
      const docpenAgents = await db.docpenVoiceAgent.findMany({
        where: { userId: session.user.id },
        select: { elevenLabsAgentId: true },
      });

      if (docpenAgents.length > 0) {
        // Fetch conversation details from ElevenLabs to verify agent ownership
        try {
          const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
          if (elevenLabsApiKey) {
            const convResponse = await fetch(
              `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
              {
                headers: { "xi-api-key": elevenLabsApiKey },
              },
            );

            if (convResponse.ok) {
              const convData = await convResponse.json();
              const userAgentIds = new Set(
                docpenAgents.map((a) => a.elevenLabsAgentId),
              );
              isAuthorized = userAgentIds.has(convData.agent_id);
            }
          }
        } catch (error) {
          console.error("Error verifying Docpen conversation:", error);
        }
      }
    }

    if (!isAuthorized) {
      return apiErrors.notFound("Call not found or unauthorized");
    }

    // Fetch audio from ElevenLabs with authentication
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      return apiErrors.internal("ElevenLabs API key not configured");
    }

    console.log(
      "🎙️ [Audio Proxy] Fetching audio for conversation:",
      conversationId,
    );

    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      {
        headers: {
          "xi-api-key": elevenLabsApiKey,
        },
      },
    );

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error("❌ [Audio Proxy] Failed to fetch audio:", {
        status: audioResponse.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: "Failed to fetch audio from ElevenLabs" },
        { status: audioResponse.status },
      );
    }

    // Get audio as blob and stream it to client
    const audioBlob = await audioResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    console.log(
      "✅ [Audio Proxy] Audio fetched successfully, size:",
      audioBuffer.byteLength,
    );

    // Return audio with appropriate headers
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type":
          audioResponse.headers.get("Content-Type") || "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error: any) {
    console.error("❌ [Audio Proxy] Error:", error);
    return apiErrors.internal(error.message || "Failed to fetch audio");
  }
}
