/**
 * GET /api/ehr-bridge/notes
 * List pushable Docpen sessions for the extension
 * Requires: Authorization: Bearer <extension_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUSHABLE_STATUSES = ["SIGNED", "REVIEW_PENDING"];

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token || !token.startsWith("ehr_")) {
      return apiErrors.unauthorized("Invalid or missing token");
    }

    const apiKeys: any[] = await getMetaDb().apiKey.findMany({
      where: {
        service: "ehr_bridge",
        keyName: "extension_token",
        isActive: true,
      },
      include: { user: true },
    } as any);

    let apiKey: (typeof apiKeys)[0] | null = null;
    for (const key of apiKeys) {
      try {
        const parsed = JSON.parse(key.keyValue) as {
          token: string;
          expiresAt: string;
        };
        if (
          parsed.token === token &&
          new Date(parsed.expiresAt) >= new Date()
        ) {
          apiKey = key;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!apiKey) {
      return apiErrors.unauthorized("Invalid or expired token");
    }

    const ctx = await resolveDalContext(apiKey.userId);
    const db = getCrmDb(ctx);

    const sessions: any[] = await (db as any).docpenSession.findMany({
      where: {
        userId: apiKey.userId,
        status: { in: PUSHABLE_STATUSES },
      },
      orderBy: { sessionDate: "desc" },
      take: 20,
      include: {
        lead: {
          select: {
            id: true,
            contactPerson: true,
            businessName: true,
          },
        },
        soapNotes: {
          where: { isCurrentVersion: true },
          take: 1,
        },
      },
    });

    const notes = sessions
      .filter((s) => s.soapNotes.length > 0)
      .map((s) => {
        const note = s.soapNotes[0];
        return {
          id: s.id,
          patientName:
            s.patientName ||
            s.lead?.contactPerson ||
            s.lead?.businessName ||
            "Unknown",
          sessionDate: s.sessionDate.toISOString(),
          chiefComplaint: s.chiefComplaint,
          consultantName: s.consultantName,
          hasNote: !!(
            note?.subjective ||
            note?.objective ||
            note?.assessment ||
            note?.plan
          ),
        };
      });

    return NextResponse.json({
      notes,
      userEmail: apiKey.user.email,
    });
  } catch (error) {
    console.error("[EHR Bridge] Notes fetch failed:", error);
    return apiErrors.internal("Failed to fetch notes");
  }
}
