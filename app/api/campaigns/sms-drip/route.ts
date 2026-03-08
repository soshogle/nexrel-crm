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

    const campaigns = await db.smsCampaign.findMany({
      where: {
        userId: ctx.userId,
        isSequence: true,
      },
      include: {
        _count: {
          select: {
            sequences: true,
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching SMS drip campaigns:", error);
    return apiErrors.internal("Failed to fetch SMS drip campaigns");
  }
}

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

    const body = await request.json();
    const { name, status, triggerType, fromNumber, tags } = body;

    const campaign = await db.smsCampaign.create({
      data: {
        userId: ctx.userId,
        name,
        message: "", // Empty for sequence campaigns
        status: status || "DRAFT",
        isSequence: true,
        triggerType,
        fromNumber,
        tags,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Error creating SMS drip campaign:", error);
    return apiErrors.internal("Failed to create SMS drip campaign");
  }
}
