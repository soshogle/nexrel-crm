import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { conversationService } from "@/lib/dal/conversation-service";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Send Instagram Direct Message
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { recipientId, message, conversationId } = body;

    if (!recipientId || !message) {
      return apiErrors.badRequest("Missing recipientId or message");
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    // Get Instagram connection
    const connection: any = await db.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: "INSTAGRAM",
        status: "CONNECTED",
      },
    } as any);

    if (!connection || !connection.accessToken) {
      return apiErrors.badRequest(
        "Instagram not connected. Please connect your Instagram account first.",
      );
    }

    // Send message via Instagram Graph API
    const instagramResponse = await fetch(
      `https://graph.instagram.com/v18.0/me/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${connection.accessToken}`,
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: message,
          },
        }),
      },
    );

    if (!instagramResponse.ok) {
      const errorData = await instagramResponse.json();
      console.error("❌ Instagram send error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to send message" },
        { status: instagramResponse.status },
      );
    }

    const responseData = await instagramResponse.json();

    let conversation;
    if (conversationId) {
      conversation = await conversationService.findUnique(ctx, conversationId);
    }

    if (!conversation) {
      conversation = await conversationService.create(ctx, {
        channelConnectionId: connection.id,
        contactIdentifier: recipientId,
        contactName: recipientId,
        status: "ACTIVE",
        lastMessageAt: new Date(),
      } as any);
    } else {
      await conversationService.update(ctx, conversation.id, {
        lastMessageAt: new Date(),
        status: "ACTIVE",
      });
    }

    // Store message in database
    const conversationMessage = await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: session.user.id,
        direction: "OUTBOUND",
        content: message,
        externalMessageId: responseData.message_id,
        status: "SENT",
      },
    });

    console.log("✅ Instagram message sent:", responseData.message_id);

    return NextResponse.json({
      success: true,
      messageId: responseData.message_id,
      conversationId: conversation.id,
      message: conversationMessage,
    });
  } catch (error: any) {
    console.error("❌ Error sending Instagram message:", error);
    return apiErrors.internal(error.message || "Failed to send message");
  }
}
