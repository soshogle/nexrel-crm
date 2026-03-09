/**
 * User AI Team API - CRUD for "Your AI Team" employees
 * GET: List user's AI Team employees
 * POST: Create new AI Team employee
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { ensureUserHasVoiceAgent } from "@/lib/ensure-voice-agent";
import { apiErrors } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const employees = await db.userAIEmployee.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        profession: e.profession,
        customName: e.customName,
        voiceAgentId: e.voiceAgentId,
        voiceConfig: e.voiceConfig,
        isActive: e.isActive,
        capabilities: e.capabilities,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[API] GET /api/ai-employees/user:", error);
    return apiErrors.internal(error.message || "Failed to fetch AI Team");
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
    let { profession, customName, voiceAgentId, voiceConfig } = body;

    if (!profession || !customName) {
      return apiErrors.badRequest("profession and customName are required");
    }

    // If no voice agent assigned, ensure user has one and auto-assign
    if (!voiceAgentId) {
      try {
        const { agentId } = await ensureUserHasVoiceAgent(session.user.id, {
          templateId: "general_assistant",
          preferredName: `${customName} Voice`,
        });
        voiceAgentId = agentId;
      } catch (err) {
        console.warn("[API] Could not ensure voice agent:", err);
      }
    }

    const employee = await db.userAIEmployee.create({
      data: {
        userId: session.user.id,
        profession: String(profession),
        customName: String(customName),
        voiceAgentId: voiceAgentId || null,
        voiceConfig:
          voiceConfig && typeof voiceConfig === "object" ? voiceConfig : null,
        isActive: true,
      },
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        profession: employee.profession,
        customName: employee.customName,
        voiceAgentId: employee.voiceAgentId,
        voiceConfig: employee.voiceConfig,
        isActive: employee.isActive,
        capabilities: employee.capabilities,
        createdAt: employee.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[API] POST /api/ai-employees/user:", error);
    return apiErrors.internal(
      error.message || "Failed to create AI Team employee",
    );
  }
}
