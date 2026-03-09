import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { conversationService } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { aiResponseService } from "@/lib/ai-response-service";
import { apiErrors } from "@/lib/api-error";

/**
 * Generate suggested reply for human agents
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json();
    const { conversationId, incomingMessage } = body;

    if (!conversationId || !incomingMessage) {
      return apiErrors.badRequest(
        "conversationId and incomingMessage are required",
      );
    }

    // Get conversation details
    const conversation = await conversationService.findUnique(
      ctx,
      conversationId,
    );

    if (!conversation) {
      return apiErrors.notFound("Conversation not found");
    }

    const sortedMessages = (conversation.messages || [])
      .sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      )
      .slice(0, 10);
    const conversationHistory = sortedMessages.map((msg) => ({
      role:
        msg.direction === "INBOUND"
          ? ("user" as const)
          : ("assistant" as const),
      content: msg.content,
      timestamp: msg.sentAt,
    }));

    const suggestedReply = await aiResponseService.generateSuggestedReply({
      conversationId: conversation.id,
      userId: ctx.userId,
      incomingMessage,
      contactName: conversation.contactName,
      channelType: (conversation as any).channelConnection?.channelType,
      conversationHistory,
    });

    return NextResponse.json({ suggestedReply });
  } catch (error) {
    console.error("Failed to generate suggested reply:", error);
    return apiErrors.internal("Failed to generate suggested reply");
  }
}
