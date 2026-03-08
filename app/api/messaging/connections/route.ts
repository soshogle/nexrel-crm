import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    const connections = await db.channelConnection.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
    });

    // Remove sensitive data before sending to client
    const sanitizedConnections = connections.map((conn: any) => ({
      id: conn.id,
      channelType: conn.channelType,
      displayName: conn.displayName,
      channelIdentifier: conn.channelIdentifier,
      status: conn.status,
      providerType: conn.providerType,
      errorMessage: conn.errorMessage,
      createdAt: conn.createdAt.toISOString(),
    }));

    return NextResponse.json(sanitizedConnections);
  } catch (error) {
    console.error("Failed to fetch connections:", error);
    return apiErrors.internal("Failed to fetch connections");
  }
}
