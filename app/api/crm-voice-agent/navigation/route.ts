import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    const row = await db.auditLog.findFirst({
      where: {
        userId: session.user.id,
        entityType: "VOICE_NAVIGATION_INTENT",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        metadata: true,
      },
    });

    const metadata = row?.metadata as any;
    const path = typeof metadata?.path === "string" ? metadata.path : null;
    const consumed = Boolean(metadata?.consumed);
    if (!row?.id || !path || consumed) {
      return NextResponse.json({ success: true, intent: null });
    }

    await db.auditLog.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...(metadata || {}),
          consumed: true,
          consumedAt: new Date().toISOString(),
        } as any,
      },
    });

    return NextResponse.json({
      success: true,
      intent: {
        path,
      },
    });
  } catch (error: any) {
    console.error("[crm-voice-agent] navigation intent read error", error);
    return apiErrors.internal(
      error?.message || "Failed to read navigation intent",
    );
  }
}
