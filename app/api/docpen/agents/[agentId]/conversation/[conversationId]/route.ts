/**
 * Docpen Single Conversation API
 *
 * GET - Get conversation details with full transcript and audio
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { elevenLabsKeyManager } from "@/lib/elevenlabs-key-manager";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// GET - Get detailed conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string; conversationId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { agentId, conversationId } = params;

    // Verify ownership
    const agent = await db.docpenVoiceAgent.findFirst({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return apiErrors.notFound("Agent not found");
    }

    // Get conversation from database
    const conversation = await db.docpenConversation.findFirst({
      where: {
        id: conversationId,
        agentId: agentId,
      },
    });

    if (!conversation) {
      return apiErrors.notFound("Conversation not found");
    }

    // If we don't have full details, fetch from ElevenLabs
    let audioUrl = conversation.audioUrl;
    let transcript = conversation.transcript
      ? JSON.parse(conversation.transcript)
      : null;

    if (!audioUrl || !transcript) {
      const apiKey = await elevenLabsKeyManager.getActiveApiKey(
        session.user.id,
      );
      if (apiKey) {
        try {
          const response = await fetch(
            `${ELEVENLABS_BASE_URL}/convai/conversations/${conversation.elevenLabsConvId}`,
            {
              headers: { "xi-api-key": apiKey },
            },
          );

          if (response.ok) {
            const data = await response.json();

            // Update with full details
            if (data.transcript) {
              transcript = data.transcript;
              await db.docpenConversation.update({
                where: { id: conversation.id },
                data: {
                  transcript: JSON.stringify(data.transcript),
                },
              });
            }

            // Fetch audio if available
            if (data.metadata?.recording_url) {
              audioUrl = data.metadata.recording_url;
            }
          }
        } catch (e) {
          console.error("⚠️ Error fetching conversation details:", e);
        }
      }
    }

    // Try to get audio URL directly
    if (!audioUrl) {
      const apiKey = await elevenLabsKeyManager.getActiveApiKey(
        session.user.id,
      );
      if (apiKey) {
        try {
          const audioResponse = await fetch(
            `${ELEVENLABS_BASE_URL}/convai/conversations/${conversation.elevenLabsConvId}/audio`,
            {
              headers: { "xi-api-key": apiKey },
            },
          );

          if (audioResponse.ok) {
            // ElevenLabs returns the audio file directly or a signed URL
            const contentType = audioResponse.headers.get("content-type");
            if (contentType?.includes("audio")) {
              // It's the audio file - we can create a data URL or stream it
              audioUrl = `${ELEVENLABS_BASE_URL}/convai/conversations/${conversation.elevenLabsConvId}/audio`;
            } else {
              const audioData = await audioResponse.json();
              audioUrl = audioData.audio_url || audioData.url;
            }
          }
        } catch (e) {
          console.error("⚠️ Error fetching audio URL:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        audioUrl,
        transcript,
      },
    });
  } catch (error: any) {
    console.error("❌ [Docpen Conversation] Error:", error);
    return apiErrors.internal(error.message || "Failed to fetch conversation");
  }
}
