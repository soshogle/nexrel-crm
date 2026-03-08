import { NextRequest, NextResponse } from "next/server";
import { getIndustryDb } from "@/lib/db/industry-db";
import { emitCRMEvent } from "@/lib/crm-event-emitter";
import { apiErrors } from "@/lib/api-error";

type RouteContext = {
  params: Promise<{ trackingId: string }>;
};

// GET /api/campaigns/drip/track/[trackingId]/click - Track email click

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getCandidateDbs() {
  const list: Array<ReturnType<typeof getIndustryDb>> = [getIndustryDb(null)];
  const seen = new Set<string>(["main"]);

  for (const key of Object.keys(process.env)) {
    if (!key.startsWith("DATABASE_URL_")) continue;
    const industry = key.replace("DATABASE_URL_", "");
    if (!industry || seen.has(industry)) continue;
    seen.add(industry);
    try {
      list.push(getIndustryDb(industry));
    } catch {
      // Ignore invalid/missing industry clients
    }
  }

  return list;
}

async function findMessageByTrackingId(trackingId: string) {
  const dbs = getCandidateDbs();
  for (const db of dbs) {
    const message = await db.emailDripMessage.findUnique({
      where: { trackingId },
      include: {
        enrollment: {
          include: {
            campaign: { select: { userId: true } },
          },
        },
        sequence: true,
      },
    });
    if (message) return { db, message };
  }
  return null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { trackingId } = await context.params;
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return apiErrors.badRequest("URL parameter is required");
    }

    const located = await findMessageByTrackingId(trackingId);
    const message = located?.message;
    const db = located?.db;

    if (message && db) {
      const now = new Date();
      const updateData: any = {
        clickCount: { increment: 1 },
        clickedAt: now,
      };

      // Set first clicked timestamp if not already set
      if (!message.firstClickedAt) {
        updateData.firstClickedAt = now;
      }

      // Update clicked links array
      const clickedLinks = (message.clickedLinks as string[]) || [];
      if (!clickedLinks.includes(url)) {
        clickedLinks.push(url);
        updateData.clickedLinks = clickedLinks;
      }

      // Update message status if allowed
      if (["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(message.status)) {
        updateData.status = "CLICKED";
      }

      // Update message
      await db.emailDripMessage.update({
        where: { id: message.id },
        data: updateData,
      });

      // Update enrollment
      await db.emailDripEnrollment.update({
        where: { id: message.enrollmentId },
        data: {
          totalClicked: { increment: 1 },
          lastEngagedAt: now,
        },
      });

      // Update sequence stats
      await db.emailDripSequence.update({
        where: { id: message.sequenceId },
        data: {
          totalClicked: { increment: 1 },
        },
      });

      const userId = message.enrollment?.campaign?.userId;
      if (userId) {
        emitCRMEvent("email_clicked", userId, {
          entityId: trackingId,
          entityType: "EmailTracking",
        });
      }
    }

    // Redirect to original URL
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    console.error("Error tracking email click:", error);

    // Try to redirect anyway
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (url) {
      return NextResponse.redirect(url);
    }

    return apiErrors.internal("Failed to track click");
  }
}
