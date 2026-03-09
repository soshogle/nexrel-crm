import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/soshogle/stats - Get social media messaging statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Get total connections
    const totalConnections = await db.channelConnection.count({
      where: {
        userId: session.user.id,
        channelType: {
          in: ["INSTAGRAM", "FACEBOOK_MESSENGER", "WHATSAPP"],
        },
        providerType: {
          in: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
        },
      },
    });

    // Get active connections
    const activeConnections = await db.channelConnection.count({
      where: {
        userId: session.user.id,
        channelType: {
          in: ["INSTAGRAM", "FACEBOOK_MESSENGER", "WHATSAPP"],
        },
        providerType: {
          in: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
        },
        status: "CONNECTED",
        isActive: true,
      },
    });

    // Get channel connection IDs for social media
    const socialChannels = await db.channelConnection.findMany({
      where: {
        userId: session.user.id,
        channelType: {
          in: ["INSTAGRAM", "FACEBOOK_MESSENGER", "WHATSAPP"],
        },
      },
      select: {
        id: true,
      },
    });

    const channelIds = socialChannels.map((ch) => ch.id);

    // Get message counts from conversations
    let messagesReceived = 0;
    let messagesSent = 0;

    if (channelIds.length > 0) {
      const messages = await db.conversationMessage.findMany({
        where: {
          conversation: {
            channelConnectionId: {
              in: channelIds,
            },
          },
        },
        select: {
          direction: true,
        },
      });

      messages.forEach((msg) => {
        if (msg.direction === "INBOUND") {
          messagesReceived++;
        } else if (msg.direction === "OUTBOUND") {
          messagesSent++;
        }
      });
    }

    return NextResponse.json({
      totalConnections,
      activeConnections,
      messagesReceived,
      messagesSent,
    });
  } catch (error: any) {
    console.error("Error fetching social media stats:", error);
    return apiErrors.internal("Failed to fetch statistics");
  }
}
