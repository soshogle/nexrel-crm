import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const campaign = await db.emailCampaign.findUnique({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      include: {
        recipients: {
          include: {
            lead: {
              select: { id: true, businessName: true, email: true },
            },
            deal: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    return NextResponse.json(campaign);
  } catch (error: unknown) {
    console.error("Error fetching campaign:", error);
    return apiErrors.internal("Failed to fetch campaign");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const body = await req.json();
    const {
      name,
      subject,
      previewText,
      htmlContent,
      textContent,
      fromName,
      fromEmail,
      replyTo,
      scheduledFor,
      status,
    } = body;

    const campaign = await db.emailCampaign.update({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      data: {
        name,
        subject,
        previewText,
        htmlContent,
        textContent,
        fromName,
        fromEmail,
        replyTo,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status,
      },
    });

    return NextResponse.json(campaign);
  } catch (error: unknown) {
    console.error("Error updating campaign:", error);
    return apiErrors.internal("Failed to update campaign");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    await db.emailCampaign.delete({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting campaign:", error);
    return apiErrors.internal("Failed to delete campaign");
  }
}
