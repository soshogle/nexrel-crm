/**
 * API Route: Update all Docpen agents with latest function configurations
 *
 * POST - Updates all existing agents to use the latest function server URLs
 * This is needed after API migrations to ensure agents use correct endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { docpenAgentProvisioning } from "@/lib/docpen/agent-provisioning";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Get all active Docpen agents for this user
    const agents = await db.docpenVoiceAgent.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (agents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No agents found to update",
        updated: 0,
      });
    }

    console.log(
      `🔄 [Docpen] Updating ${agents.length} agents with latest function configurations...`,
    );

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const agent of agents) {
      try {
        const success = await docpenAgentProvisioning.updateAgentFunctions(
          agent.elevenLabsAgentId,
          session.user.id,
        );

        if (success) {
          updated++;
        } else {
          failed++;
          errors.push(
            `${agent.profession} (${agent.elevenLabsAgentId}): Update failed`,
          );
        }
      } catch (error: any) {
        failed++;
        errors.push(
          `${agent.profession} (${agent.elevenLabsAgentId}): ${error.message}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} of ${agents.length} agents`,
      updated,
      failed,
      total: agents.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("❌ [Docpen] Error updating agent functions:", error);
    return apiErrors.internal(error.message || "Failed to update agents");
  }
}
