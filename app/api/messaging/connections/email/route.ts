import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { encrypt } from "@/lib/encryption";
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

    const { email, password, smtpHost, smtpPort, imapHost, imapPort } =
      await request.json();

    if (
      !email ||
      !password ||
      !smtpHost ||
      !smtpPort ||
      !imapHost ||
      !imapPort
    ) {
      return apiErrors.badRequest("Missing required fields");
    }

    // Check if connection already exists
    const existingConnection = await db.channelConnection.findFirst({
      where: {
        userId: ctx.userId,
        channelType: "EMAIL",
        channelIdentifier: email,
      },
    });

    const connectionData = {
      status: "CONNECTED" as const,
      providerType: "custom_email",
      providerData: {
        email,
        password: encrypt(password),
        smtpHost,
        smtpPort: parseInt(smtpPort),
        imapHost,
        imapPort: parseInt(imapPort),
      },
    };

    if (existingConnection) {
      // Update existing connection
      const updated = await db.channelConnection.update({
        where: { id: existingConnection.id },
        data: connectionData,
      });

      return NextResponse.json({ success: true, connection: updated });
    }

    // Create new connection
    const connection = await db.channelConnection.create({
      data: {
        userId: ctx.userId,
        channelType: "EMAIL",
        channelIdentifier: email,
        displayName: email,
        ...connectionData,
      },
    });

    return NextResponse.json({ success: true, connection });
  } catch (error) {
    console.error("Failed to connect email:", error);
    return apiErrors.internal("Failed to connect email");
  }
}
