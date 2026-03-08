import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/workflows/instances - List user's workflow instances
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      userId: ctx.userId,
    };

    if (status) {
      where.status = status;
    }

    const instances = await db.aIWorkflowInstance.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            confidence: true,
          },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, instances });
  } catch (error: any) {
    console.error("Error fetching workflow instances:", error);
    return apiErrors.internal(
      error.message || "Failed to fetch workflow instances",
    );
  }
}

// POST /api/workflows/instances - Create workflow instance from template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { templateId, name, description, triggerType, triggerConfig } = body;

    if (!name || !triggerType) {
      return apiErrors.badRequest("Missing required fields: name, triggerType");
    }

    let definition: any = {};
    if (templateId) {
      const template = await db.aIWorkflowTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return apiErrors.notFound("Template not found");
      }

      definition = template.workflowDefinition;
    }

    const instance = await db.aIWorkflowInstance.create({
      data: {
        userId: ctx.userId,
        templateId: templateId || undefined,
        name,
        description,
        definition,
        triggerType,
        triggerConfig: triggerConfig || {},
        status: "DRAFT",
      },
      include: {
        template: true,
      },
    });

    return NextResponse.json({ success: true, instance });
  } catch (error: any) {
    console.error("Error creating workflow instance:", error);
    return apiErrors.internal(
      error.message || "Failed to create workflow instance",
    );
  }
}
