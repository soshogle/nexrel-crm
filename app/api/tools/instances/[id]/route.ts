import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/tools/instances/[id] - Get tool instance details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const instance = await getCrmDb(ctx).toolInstance.findUnique({
      where: { id: params.id },
      include: {
        definition: true,
        actions: {
          orderBy: { executedAt: "desc" },
          take: 10, // Last 10 actions
        },
      },
    });

    if (!instance) {
      return apiErrors.notFound("Tool instance not found");
    }

    // Verify ownership
    if (instance.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    // Sanitize credentials
    const sanitized = {
      ...instance,
      credentials: { configured: true },
    };

    return NextResponse.json({ success: true, instance: sanitized });
  } catch (error: any) {
    console.error("Error fetching tool instance:", error);
    return apiErrors.internal(error.message || "Failed to fetch tool instance");
  }
}

// PATCH /api/tools/instances/[id] - Update tool instance
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { name, description, status, config } = body;

    // Verify ownership
    const existing = await db.toolInstance.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return apiErrors.notFound("Tool instance not found");
    }

    if (existing.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const updated = await db.toolInstance.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(status && { status }),
        ...(config && { config }),
      },
      include: {
        definition: true,
      },
    });

    return NextResponse.json({
      success: true,
      instance: {
        ...updated,
        credentials: { configured: true },
      },
    });
  } catch (error: any) {
    console.error("Error updating tool instance:", error);
    return apiErrors.internal(
      error.message || "Failed to update tool instance",
    );
  }
}

// DELETE /api/tools/instances/[id] - Uninstall a tool
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Verify ownership
    const instance = await db.toolInstance.findUnique({
      where: { id: params.id },
    });

    if (!instance) {
      return apiErrors.notFound("Tool instance not found");
    }

    if (instance.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    // Delete all associated actions first
    await db.toolAction.deleteMany({
      where: { instanceId: params.id },
    });

    // Delete the instance
    await db.toolInstance.delete({
      where: { id: params.id },
    });

    // Decrement install count
    await db.toolDefinition.update({
      where: { id: instance.definitionId },
      data: { installCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting tool instance:", error);
    return apiErrors.internal(
      error.message || "Failed to delete tool instance",
    );
  }
}
