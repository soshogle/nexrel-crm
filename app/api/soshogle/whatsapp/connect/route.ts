import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * WhatsApp Business API Connection
 * Connect using WhatsApp Business API credentials
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { phoneNumberId, accessToken, businessAccountId } = body;

    if (!phoneNumberId || !accessToken || !businessAccountId) {
      return apiErrors.badRequest(
        "Missing required fields: phoneNumberId, accessToken, businessAccountId",
      );
    }

    // Verify the access token by fetching phone number details
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${accessToken}`,
    );

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      console.error("WhatsApp verification error:", errorData);
      return apiErrors.badRequest(
        "Failed to verify WhatsApp credentials. Please check your access token and phone number ID.",
      );
    }

    const phoneData = await verifyResponse.json();
    const displayNumber =
      phoneData.display_phone_number ||
      phoneData.verified_name ||
      "WhatsApp Business";

    // Store connection in database
    const existingConn = await db.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: "WHATSAPP",
        channelIdentifier: phoneNumberId,
      },
    });

    let connection;
    if (existingConn) {
      connection = await db.channelConnection.update({
        where: { id: existingConn.id },
        data: {
          accessToken,
          displayName: displayNumber,
          status: "CONNECTED",
          providerType: "whatsapp",
          providerAccountId: businessAccountId,
          providerData: phoneData,
          lastSyncAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      connection = await db.channelConnection.create({
        data: {
          userId: session.user.id,
          channelType: "WHATSAPP",
          channelIdentifier: phoneNumberId,
          accessToken,
          displayName: displayNumber,
          status: "CONNECTED",
          providerType: "whatsapp",
          providerAccountId: businessAccountId,
          providerData: phoneData,
          syncEnabled: true,
        },
      });
    }

    console.log(
      `✅ WhatsApp Business connected: ${displayNumber} (${phoneNumberId})`,
    );

    return NextResponse.json({
      success: true,
      message: "WhatsApp Business account connected successfully",
      connection: {
        id: connection.id,
        displayName: connection.displayName,
        phoneNumberId,
      },
    });
  } catch (error: any) {
    console.error("WhatsApp connection error:", error);
    return apiErrors.internal(
      error.message || "Failed to connect WhatsApp Business",
    );
  }
}
