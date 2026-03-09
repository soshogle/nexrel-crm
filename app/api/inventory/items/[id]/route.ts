import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET INVENTORY ITEM BY ID
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const item = await db.inventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        supplier: true,
        adjustments: {
          orderBy: {
            timestamp: "desc",
          },
          take: 10,
        },
        alerts: {
          where: {
            isResolved: false,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            adjustments: true,
            recipeIngredients: true,
          },
        },
      },
    });

    if (!item) {
      return apiErrors.notFound("Item not found");
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("❌ Inventory item fetch error:", error);
    return apiErrors.internal("Failed to fetch inventory item");
  }
}

/**
 * UPDATE INVENTORY ITEM
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const body = await req.json();
    const {
      name,
      description,
      minimumStock,
      maximumStock,
      reorderQuantity,
      costPerUnit,
      sellingPrice,
      supplierId,
      expirationDate,
      location,
      barcode,
      trackExpiration,
      autoReorder,
      isActive,
    } = body;

    // Verify item exists
    const existing = await db.inventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return apiErrors.notFound("Item not found");
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (minimumStock !== undefined) updateData.minimumStock = minimumStock;
    if (maximumStock !== undefined) updateData.maximumStock = maximumStock;
    if (reorderQuantity !== undefined)
      updateData.reorderQuantity = reorderQuantity;
    if (costPerUnit !== undefined) updateData.costPerUnit = costPerUnit;
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate
        ? new Date(expirationDate)
        : null;
    }
    if (location !== undefined) updateData.location = location;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (trackExpiration !== undefined)
      updateData.trackExpiration = trackExpiration;
    if (autoReorder !== undefined) updateData.autoReorder = autoReorder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedItem = await db.inventoryItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        supplier: true,
      },
    });

    console.log(`✅ Inventory item updated: ${updatedItem.name}`);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("❌ Inventory item update error:", error);
    return apiErrors.internal("Failed to update inventory item");
  }
}

/**
 * DELETE INVENTORY ITEM
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Verify item exists
    const item = await db.inventoryItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            recipeIngredients: true,
          },
        },
      },
    });

    if (!item) {
      return apiErrors.notFound("Item not found");
    }

    // Check if item is used in recipes
    if (item._count.recipeIngredients > 0) {
      return apiErrors.badRequest("Cannot delete item that is used in recipes");
    }

    // Soft delete by marking as inactive
    await db.inventoryItem.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    console.log(`✅ Inventory item deactivated: ${item.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Inventory item delete error:", error);
    return apiErrors.internal("Failed to delete inventory item");
  }
}
