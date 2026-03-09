import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/general-inventory/items/[id] - Get item details
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

    const item = await db.generalInventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        category: true,
        supplier: true,
        location: true,
        adjustments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!item) {
      return apiErrors.notFound("Item not found");
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("Error fetching item:", error);
    return apiErrors.internal(error.message);
  }
}

// PUT /api/general-inventory/items/[id] - Update item
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
    const {
      name,
      description,
      categoryId,
      supplierId,
      locationId,
      reorderLevel,
      reorderQuantity,
      unit,
      costPrice,
      sellingPrice,
      barcode,
      imageUrl,
      notes,
      isActive,
    } = body;

    // Verify ownership
    const existingItem = await db.generalInventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingItem) {
      return apiErrors.notFound("Item not found");
    }

    const item = await db.generalInventoryItem.update({
      where: { id: params.id },
      data: {
        name,
        description,
        categoryId,
        supplierId,
        locationId,
        reorderLevel,
        reorderQuantity,
        unit,
        costPrice,
        sellingPrice,
        barcode,
        imageUrl,
        notes,
        isActive,
      },
      include: {
        category: true,
        supplier: true,
        location: true,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("Error updating item:", error);
    return apiErrors.internal(error.message);
  }
}

// DELETE /api/general-inventory/items/[id] - Delete item
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
    const existingItem = await db.generalInventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingItem) {
      return apiErrors.notFound("Item not found");
    }

    // Soft delete by setting isActive to false
    await db.generalInventoryItem.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting item:", error);
    return apiErrors.internal(error.message);
  }
}
