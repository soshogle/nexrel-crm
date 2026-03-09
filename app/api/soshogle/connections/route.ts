import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/soshogle/connections - List all social media connections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const connections = await getCrmDb(ctx).channelConnection.findMany({
      where: {
        userId: session.user.id,
        channelType: {
          in: ["INSTAGRAM", "FACEBOOK_MESSENGER", "WHATSAPP"],
        },
        providerType: {
          in: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ connections });
  } catch (error: any) {
    console.error("Error fetching social media connections:", error);
    return apiErrors.internal("Failed to fetch connections");
  }
}
