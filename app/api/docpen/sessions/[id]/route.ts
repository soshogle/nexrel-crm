/**
 * AI Docpen - Single Session API
 *
 * Endpoints:
 * - GET: Get session details with transcriptions and SOAP notes
 * - PATCH: Update session (status, sign, etc.)
 * - DELETE: Cancel/archive session
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import {
  generateSignatureHash,
  sanitizeForLogging,
  createAuditLogEntry,
} from "@/lib/docpen/security";
import { logDocpenAudit, DOCPEN_AUDIT_EVENTS } from "@/lib/docpen/audit-log";
import { apiErrors } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { id } = await params;

    const docpenSession = await db.docpenSession.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        transcriptions: {
          orderBy: { startTime: "asc" },
        },
        soapNotes: {
          orderBy: { version: "desc" },
        },
        assistantQueries: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!docpenSession) {
      return apiErrors.notFound("Session not found");
    }

    // Log audit entry
    console.log(
      "[Docpen Audit]",
      sanitizeForLogging(
        createAuditLogEntry("read", "session", id, session.user.id, request),
      ),
    );

    return NextResponse.json({ session: docpenSession });
  } catch (error) {
    console.error("[Docpen Session GET] Error:", error);
    return apiErrors.internal("Failed to fetch session");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { id } = await params;
    const body = await request.json();
    const {
      action,
      signedBy,
      attestation,
      status,
      chiefComplaint,
      patientName,
    } = body;

    // Verify session belongs to user
    const existingSession = await db.docpenSession.findFirst({
      where: { id, userId: session.user.id },
      include: {
        soapNotes: {
          where: { isCurrentVersion: true },
        },
      },
    });

    if (!existingSession) {
      return apiErrors.notFound("Session not found");
    }

    let updateData: Record<string, any> = {};

    // Handle sign action
    if (action === "sign") {
      if (!signedBy || !attestation) {
        return apiErrors.badRequest(
          "signedBy and attestation are required for signing",
        );
      }

      if (existingSession.status === "SIGNED") {
        return apiErrors.badRequest("Session is already signed");
      }

      // Generate signature hash
      const soapContent = existingSession.soapNotes[0]
        ? JSON.stringify(existingSession.soapNotes[0])
        : "";
      const signedAt = new Date();
      const signatureHash = generateSignatureHash(
        id,
        signedBy,
        signedAt,
        soapContent,
      );

      updateData = {
        status: "SIGNED",
        signedAt,
        signedBy,
        signatureHash,
        reviewedAt: existingSession.reviewedAt || signedAt,
      };

      // Log sign audit entry
      console.log(
        "[Docpen Audit - SIGN]",
        sanitizeForLogging(
          createAuditLogEntry("sign", "session", id, session.user.id, request),
        ),
      );
      await logDocpenAudit(id, DOCPEN_AUDIT_EVENTS.SIGNED, { signedBy });
    }
    // Handle status update
    else if (status) {
      const validStatuses = [
        "RECORDING",
        "PROCESSING",
        "REVIEW_PENDING",
        "ARCHIVED",
        "CANCELLED",
      ];
      if (!validStatuses.includes(status)) {
        return apiErrors.badRequest("Invalid status");
      }

      // Can't change status if already signed (except to archive)
      if (existingSession.status === "SIGNED" && status !== "ARCHIVED") {
        return apiErrors.badRequest("Cannot change status of a signed session");
      }

      updateData.status = status;
      if (status === "REVIEW_PENDING") {
        updateData.reviewedAt = new Date();
      }
    }

    // Allow updating basic info if not signed
    if (existingSession.status !== "SIGNED") {
      if (chiefComplaint !== undefined)
        updateData.chiefComplaint = chiefComplaint;
      if (patientName !== undefined) updateData.patientName = patientName;
    }

    if (Object.keys(updateData).length === 0) {
      return apiErrors.badRequest("No valid updates provided");
    }

    const updatedSession = await db.docpenSession.update({
      where: { id },
      data: updateData,
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
        },
      },
    });

    // Log update audit entry
    console.log(
      "[Docpen Audit]",
      sanitizeForLogging(
        createAuditLogEntry("update", "session", id, session.user.id, request),
      ),
    );

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("[Docpen Session PATCH] Error:", error);
    return apiErrors.internal("Failed to update session");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { id } = await params;

    // Verify session belongs to user
    const existingSession = await db.docpenSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingSession) {
      return apiErrors.notFound("Session not found");
    }

    // Don't allow deleting signed sessions - archive instead
    if (existingSession.status === "SIGNED") {
      return apiErrors.badRequest(
        "Cannot delete signed sessions. Archive instead.",
      );
    }

    // Cancel the session instead of hard delete for audit trail
    await db.docpenSession.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Log delete audit entry
    console.log(
      "[Docpen Audit]",
      sanitizeForLogging(
        createAuditLogEntry("delete", "session", id, session.user.id, request),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Docpen Session DELETE] Error:", error);
    return apiErrors.internal("Failed to cancel session");
  }
}
