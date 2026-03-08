import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { encrypt, decrypt } from "@/lib/encryption";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const { accountSid, authToken, phoneNumber } = await request.json();

    if (!accountSid || !authToken || !phoneNumber) {
      return apiErrors.badRequest("Missing required fields");
    }

    // Validate Twilio credentials by making a test API call
    try {
      const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64",
      );
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${twilioAuth}`,
          },
        },
      );

      if (!response.ok) {
        return apiErrors.badRequest("Invalid Soshogle Call credentials");
      }
    } catch (error) {
      console.error("Twilio validation error:", error);
      return apiErrors.badRequest(
        "Failed to validate Soshogle Call credentials",
      );
    }

    // Check if connection already exists
    const existingConnection = await db.channelConnection.findFirst({
      where: {
        userId: ctx.userId,
        channelType: "SMS",
        channelIdentifier: phoneNumber,
      },
    });

    if (existingConnection) {
      // Update existing connection
      const updated = await db.channelConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: "CONNECTED",
          providerData: {
            accountSid: encrypt(accountSid),
            authToken: encrypt(authToken),
            phoneNumber,
          },
        },
      });

      return NextResponse.json({ success: true, connection: updated });
    }

    // Create new connection
    const connection = await db.channelConnection.create({
      data: {
        userId: ctx.userId,
        channelType: "SMS",
        channelIdentifier: phoneNumber,
        displayName: `Soshogle Call ${phoneNumber}`,
        status: "CONNECTED",
        providerType: "twilio",
        providerData: {
          accountSid: encrypt(accountSid),
          authToken: encrypt(authToken),
          phoneNumber,
        },
      },
    });

    return NextResponse.json({ success: true, connection });
  } catch (error) {
    console.error("Failed to connect Twilio:", error);
    return apiErrors.internal("Failed to connect Soshogle Call");
  }
}
