import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { getMessagingProvider } from "@/lib/messaging";
import { apiErrors } from "@/lib/api-error";

// GET /api/messaging/channels - Get all connected channels

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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

    const channels = await db.channelConnection.findMany({
      where: {
        userId: ctx.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return apiErrors.internal("Failed to fetch channels");
  }
}

// POST /api/messaging/channels - Connect a new channel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { channelType, credentials } = body;

    if (!channelType) {
      return apiErrors.badRequest("Channel type is required");
    }

    const provider = getMessagingProvider(
      session.user.id,
      (session.user as { industry?: string }).industry,
    );
    const result = await provider.connectChannel({
      channelType,
      credentials,
    });

    if (!result.success) {
      return apiErrors.internal(result.error || "Failed to connect channel");
    }

    return NextResponse.json({
      success: true,
      channelId: result.channelId,
    });
  } catch (error) {
    console.error("Error connecting channel:", error);
    return apiErrors.internal("Failed to connect channel");
  }
}
