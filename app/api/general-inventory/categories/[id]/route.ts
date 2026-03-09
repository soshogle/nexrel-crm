import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/general-inventory/categories/[id]
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
    const db = getCrmDb(ctx);

    const category = await db.generalInventoryCategory.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!category) {
      return apiErrors.notFound("Category not found");
    }

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Error fetching category:", error);
    return apiErrors.internal(error.message);
  }
}

// PUT /api/general-inventory/categories/[id]
export async function PUT(
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
    const { name, description } = body;

    // Verify ownership
    const existingCategory = await db.generalInventoryCategory.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingCategory) {
      return apiErrors.notFound("Category not found");
    }

    const category = await db.generalInventoryCategory.update({
      where: { id: params.id },
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return apiErrors.internal(error.message);
  }
}

// DELETE /api/general-inventory/categories/[id]
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
    const existingCategory = await db.generalInventoryCategory.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!existingCategory) {
      return apiErrors.notFound("Category not found");
    }

    // Check if category has items
    if (existingCategory._count.items > 0) {
      return apiErrors.badRequest(
        "Cannot delete category with items. Please remove or reassign items first.",
      );
    }

    await db.generalInventoryCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return apiErrors.internal(error.message);
  }
}
