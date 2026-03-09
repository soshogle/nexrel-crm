/**
 * GET /api/ehr-bridge/schedule/pending
 * List pending appointments (syncStatus=PENDING) for extension to push to EHR
 * Requires: Bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function verifyToken(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !token.startsWith("ehr_")) return null;

  const apiKeys = await getMetaDb().apiKey.findMany({
    where: {
      service: "ehr_bridge",
      keyName: "extension_token",
      isActive: true,
    },
  });
  for (const key of apiKeys) {
    try {
      const parsed = JSON.parse(key.keyValue) as {
        token: string;
        expiresAt: string;
      };
      if (parsed.token === token && new Date(parsed.expiresAt) >= new Date()) {
        return { userId: key.userId };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    if (!auth) {
      return apiErrors.unauthorized("Invalid or expired token");
    }

    const ctx = await resolveDalContext(auth.userId);
    const db = getCrmDb(ctx);

    const appointments = await db.bookingAppointment.findMany({
      where: {
        userId: auth.userId,
        status: "SCHEDULED",
        syncStatus: "PENDING",
      },
      orderBy: { appointmentDate: "asc" },
      take: 20,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        appointmentDate: true,
        duration: true,
        notes: true,
      },
    });

    return NextResponse.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        customerName: a.customerName,
        customerEmail: a.customerEmail,
        customerPhone: a.customerPhone,
        appointmentDate: a.appointmentDate.toISOString(),
        duration: a.duration,
        notes: a.notes,
      })),
    });
  } catch (error) {
    console.error("[EHR Bridge] Pending failed:", error);
    return apiErrors.internal("Failed to fetch pending");
  }
}
