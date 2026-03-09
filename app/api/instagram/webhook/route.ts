import { NextRequest, NextResponse } from "next/server";
import { workflowEngine } from "@/lib/workflow-engine";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { conversationService } from "@/lib/dal/conversation-service";
import { leadService } from "@/lib/dal/lead-service";
import crypto from "crypto";
import { apiErrors } from "@/lib/api-error";
import { getMetaDb } from "@/lib/db/meta-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Instagram Webhook Handler
 * Receives and processes incoming Instagram messages and events
 */

// Webhook verification (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Support both INSTAGRAM_VERIFY_TOKEN and FACEBOOK_VERIFY_TOKEN (fallback)
  const verifyToken =
    process.env.INSTAGRAM_VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return process.env.NODE_ENV === "production"
      ? apiErrors.internal(
          "INSTAGRAM_VERIFY_TOKEN/FACEBOOK_VERIFY_TOKEN not configured",
        )
      : apiErrors.forbidden("Verification token not configured");
  }

  // Verify the webhook
  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;

  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  return (
    expectedBuf.length === signatureBuf.length &&
    crypto.timingSafeEqual(expectedBuf, signatureBuf)
  );
}

// Webhook event handler (POST request)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signature)) {
      return apiErrors.forbidden("Invalid signature");
    }

    const body = JSON.parse(rawBody);

    // Instagram sends events in this format
    if (body.object !== "instagram") {
      return NextResponse.json({ received: true });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // Handle messaging events (direct messages)
      for (const event of messaging) {
        await handleMessagingEvent(event);
      }

      // Handle changes (e.g., mentions, comments)
      for (const change of changes) {
        console.log("🔄 Instagram change event:", change.field);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("❌ Instagram webhook processing error:", error);
    return apiErrors.internal(error.message || "Webhook processing failed");
  }
}

/**
 * Handle Instagram messaging events
 */
async function handleMessagingEvent(event: any) {
  try {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const messageData = event.message;

    if (!senderId || !recipientId || !messageData) {
      console.log("⚠️ Incomplete Instagram message event");
      return;
    }

    // Find the channel connection by recipient ID (the Instagram account receiving the message)
    const connection: any = await getMetaDb().channelConnection.findFirst({
      where: {
        channelType: "INSTAGRAM",
        channelIdentifier: recipientId,
        status: "CONNECTED",
      },
    } as any);

    if (!connection) {
      console.log(
        "❌ No Instagram connection found for recipient:",
        recipientId,
      );
      return;
    }

    // Get sender info from Instagram Graph API if access token is available
    let senderName = senderId;
    if (connection.accessToken) {
      try {
        const userInfoResponse = await fetch(
          `https://graph.instagram.com/${senderId}?fields=id,username,name&access_token=${connection.accessToken}`,
        );
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          senderName = userInfo.name || userInfo.username || senderId;
        }
      } catch (error) {
        console.error("Error fetching sender info:", error);
      }
    }

    const ctx = await resolveDalContext(connection.userId);
    const db = getCrmDb(ctx);
    let conversation: any = await conversationService.findFirst(ctx, {
      channelConnectionId: connection.id,
      contactIdentifier: senderId,
    });

    if (!conversation) {
      conversation = await conversationService.create(ctx, {
        channelConnectionId: connection.id,
        contactIdentifier: senderId,
        contactName: senderName,
        status: "ACTIVE",
        lastMessageAt: new Date(),
      } as any);
      console.log("✨ Created new Instagram conversation:", conversation.id);
    } else {
      await conversationService.update(ctx, conversation.id, {
        contactName: senderName,
        lastMessageAt: new Date(),
        status: "ACTIVE",
      });
    }

    // Store the message
    const messageContent =
      messageData.text || messageData.attachments?.[0]?.payload?.url || "";

    const incomingMessage = await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: connection.userId,
        direction: "INBOUND",
        content: messageContent,
        externalMessageId: messageData.mid,
        status: "DELIVERED",
      },
    });

    await conversationService.update(ctx, conversation.id, {
      lastMessageAt: new Date(),
      lastMessagePreview: messageContent.substring(0, 100),
      unreadCount: { increment: 1 },
      status: "UNREAD",
    } as any);

    // Trigger workflows for MESSAGE_RECEIVED (with channel type filtering)
    workflowEngine
      .triggerWorkflow(
        "MESSAGE_RECEIVED",
        {
          userId: connection.userId,
          conversationId: conversation.id,
          messageId: incomingMessage.id,
          leadId: conversation.leadId || undefined,
          variables: {
            contactName: senderName,
            messageContent,
            channelType: "INSTAGRAM", // Explicitly set channel type for filtering
          },
        },
        {
          messageContent,
        },
      )
      .catch((err) => console.error("Instagram workflow trigger failed:", err));

    // Trigger workflows for MESSAGE_WITH_KEYWORDS
    workflowEngine
      .triggerWorkflow(
        "MESSAGE_WITH_KEYWORDS",
        {
          userId: connection.userId,
          conversationId: conversation.id,
          messageId: incomingMessage.id,
          leadId: conversation.leadId || undefined,
          variables: {
            contactName: senderName,
            messageContent,
            channelType: "INSTAGRAM", // Explicitly set channel type for filtering
          },
        },
        {
          messageContent,
        },
      )
      .catch((err) =>
        console.error("Instagram keyword workflow trigger failed:", err),
      );

    const leads = await leadService.findMany(ctx, {
      where: { phone: senderId },
      take: 1,
    });
    if (leads.length === 0) {
      await leadService.create(ctx, {
        businessName: senderName,
        contactPerson: senderName,
        phone: senderId,
        source: "Instagram DM",
        status: "NEW",
      });
      console.log("✨ Created lead from Instagram message");
    }

    console.log("✅ Instagram message processed successfully");
  } catch (error) {
    console.error("❌ Error handling Instagram messaging event:", error);
  }
}
