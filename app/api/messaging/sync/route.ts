/**
 * Message Synchronization API Endpoint
 * Manually trigger message sync for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { MessageSyncOrchestrator } from "@/lib/messaging-sync/sync-orchestrator";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const result = await MessageSyncOrchestrator.syncUserMessages(ctx.userId);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("Error in sync API:", error);
    return apiErrors.internal("Internal server error", error.message);
  }
}
