/**
 * AI Docpen - Sessions API
 *
 * Endpoints:
 * - GET: List all sessions for the user
 * - POST: Create a new clinical session
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { leadService } from "@/lib/dal/lead-service";
import { sanitizeForLogging, createAuditLogEntry } from "@/lib/docpen/security";
import { logDocpenAudit, DOCPEN_AUDIT_EVENTS } from "@/lib/docpen/audit-log";
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
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const leadId = searchParams.get("leadId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const sessions = await db.docpenSession.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status: status as any }),
        ...(leadId && { leadId }),
      },
      orderBy: { sessionDate: "desc" },
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
        soapNotes: {
          where: { isCurrentVersion: true },
          select: {
            id: true,
            subjective: true,
            assessment: true,
          },
        },
        _count: {
          select: {
            transcriptions: true,
            assistantQueries: true,
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[Docpen Sessions GET] Error:", error);
    return apiErrors.internal("Failed to fetch sessions");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const {
      leadId,
      patientName,
      profession = "GENERAL_PRACTICE",
      customProfession,
      chiefComplaint,
      consultantName,
    } = body;

    if (!consultantName || !consultantName.trim()) {
      return apiErrors.badRequest("Consultant name is required");
    }

    // Validate profession (must match DocpenProfession enum in Prisma)
    const validProfessions = [
      "GENERAL_PRACTICE",
      "DENTIST",
      "ORTHODONTIC",
      "OPTOMETRIST",
      "DERMATOLOGIST",
      "CARDIOLOGIST",
      "PSYCHIATRIST",
      "PEDIATRICIAN",
      "ORTHOPEDIC",
      "PHYSIOTHERAPIST",
      "CHIROPRACTOR",
      "CUSTOM",
    ];

    if (!validProfessions.includes(profession)) {
      return apiErrors.badRequest("Invalid profession type");
    }

    // Verify lead belongs to user if provided
    if (leadId) {
      const lead = await leadService.findUnique(ctx, leadId);
      if (!lead) {
        return apiErrors.notFound("Client record not found");
      }
    }

    // Create the session
    const docpenSession = await db.docpenSession.create({
      data: {
        userId: session.user.id,
        leadId: leadId || null,
        patientName: patientName || null,
        profession: profession as any,
        customProfession: customProfession || null,
        chiefComplaint: chiefComplaint || null,
        consultantName: consultantName || null,
        status: "RECORDING",
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
      },
    });

    // Log audit entry
    console.log(
      "[Docpen Audit]",
      sanitizeForLogging(
        createAuditLogEntry(
          "create",
          "session",
          docpenSession.id,
          session.user.id,
          request,
        ),
      ),
    );
    await logDocpenAudit(docpenSession.id, DOCPEN_AUDIT_EVENTS.SESSION_CREATED);

    return NextResponse.json({ session: docpenSession }, { status: 201 });
  } catch (error) {
    console.error("[Docpen Sessions POST] Error:", error);
    return apiErrors.internal("Failed to create session");
  }
}
