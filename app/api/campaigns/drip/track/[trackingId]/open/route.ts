import { NextRequest, NextResponse } from "next/server";
import { getIndustryDb } from "@/lib/db/industry-db";
import { emitCRMEvent } from "@/lib/crm-event-emitter";

type RouteContext = {
  params: Promise<{ trackingId: string }>;
};

// GET /api/campaigns/drip/track/[trackingId]/open - Track email open

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

    const located = await findMessageByTrackingId(trackingId);
    const message = located?.message;
    const db = located?.db;

    if (message && db) {
      const now = new Date();
      const updateData: any = {
        openCount: { increment: 1 },
        openedAt: now,
      };

      // Set first opened timestamp if not already set
      if (!message.firstOpenedAt) {
        updateData.firstOpenedAt = now;
      }

      // Update message if status allows
      if (["SENT", "DELIVERED", "OPENED"].includes(message.status)) {
        updateData.status = "OPENED";
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
          totalOpened: { increment: 1 },
          lastEngagedAt: now,
        },
      });

      // Update sequence stats
      await db.emailDripSequence.update({
        where: { id: message.sequenceId },
        data: {
          totalOpened: { increment: 1 },
        },
      });

      const userId = message.enrollment?.campaign?.userId;
      if (userId) {
        emitCRMEvent("email_opened", userId, {
          entityId: trackingId,
          entityType: "EmailTracking",
        });
      }
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
      "base64",
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pixel.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: unknown) {
    console.error("Error tracking email open:", error);

    // Still return pixel even on error
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
      "base64",
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pixel.length.toString(),
      },
    });
  }
}
