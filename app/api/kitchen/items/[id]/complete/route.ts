
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * COMPLETE KITCHEN ITEM
 * Mark item as complete and auto-deduct inventory
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { staffName } = body;

    // Get kitchen item
    const kitchenItem = await prisma.kitchenOrderItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        posOrder: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    if (!kitchenItem) {
      return NextResponse.json({ error: 'Kitchen item not found' }, { status: 404 });
    }

    // Update kitchen item status
    const updatedItem = await prisma.kitchenOrderItem.update({
      where: { id: params.id },
      data: {
        status: 'BUMPED',
        completedAt: new Date(),
      },
    });

    // Log the prep activity
    await prisma.prepLog.create({
      data: {
        kitchenItemId: params.id,
        action: 'BUMPED',
        previousStatus: kitchenItem.status,
        newStatus: 'BUMPED',
        staffName,
        notes: 'Item completed and bumped',
        timestamp: new Date(),
      },
    });

    // Auto-deduct inventory for recipes (if configured)
    // Check if item has recipe mapping
    const recipe = await prisma.recipe.findFirst({
      where: {
        userId: session.user.id,
        name: {
          contains: kitchenItem.itemName,
          mode: 'insensitive',
        },
        isActive: true,
      },
      include: {
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (recipe) {
      console.log(`📦 Found recipe for ${kitchenItem.itemName}, deducting ingredients...`);

      // Deduct each ingredient from inventory
      for (const ingredient of recipe.ingredients) {
        const quantityToDeduct = Number(ingredient.quantity) * kitchenItem.quantity;

        // Get current inventory item
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: ingredient.inventoryItemId },
        });

        if (!inventoryItem) continue;

        const currentStock = Number(inventoryItem.currentStock);
        const newStock = Math.max(0, currentStock - quantityToDeduct);

        // Update inventory stock
        await prisma.inventoryItem.update({
          where: { id: ingredient.inventoryItemId },
          data: {
            currentStock: newStock,
          },
        });

        // Create adjustment record
        await prisma.inventoryAdjustment.create({
          data: {
            userId: session.user.id,
            inventoryItemId: ingredient.inventoryItemId,
            type: 'PRODUCTION',
            quantityChange: -quantityToDeduct,
            previousStock: currentStock,
            newStock,
            reason: `Used in ${recipe.name} for order`,
            notes: `Kitchen order ${kitchenItem.posOrder.orderNumber}, ${kitchenItem.quantity}x ${kitchenItem.itemName}`,
            staffName,
            timestamp: new Date(),
          },
        });

        console.log(
          `  ✅ Deducted ${quantityToDeduct} ${inventoryItem.unit} of ${inventoryItem.name}`
        );

        // Check for low stock alerts
        if (newStock <= Number(inventoryItem.minimumStock)) {
          // Check if alert already exists
          const existingAlert = await prisma.stockAlert.findFirst({
            where: {
              userId: session.user.id,
              inventoryItemId: ingredient.inventoryItemId,
              isResolved: false,
            },
          });

          if (!existingAlert) {
            await prisma.stockAlert.create({
              data: {
                userId: session.user.id,
                inventoryItemId: ingredient.inventoryItemId,
                alertType: newStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
                message: `${inventoryItem.name} is ${newStock <= 0 ? 'out of stock' : 'low on stock'} (${newStock} ${inventoryItem.unit})`,
                severity: newStock <= 0 ? 'CRITICAL' : 'HIGH',
              },
            });
          }
        }
      }
    } else {
      console.log(`ℹ️  No recipe found for ${kitchenItem.itemName}, skipping inventory deduction`);
    }

    console.log(`✅ Kitchen item completed: ${kitchenItem.itemName}`);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      inventoryDeducted: !!recipe,
      ingredientsCount: recipe?.ingredients.length || 0,
    });
  } catch (error) {
    console.error('❌ Kitchen item complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete kitchen item' },
      { status: 500 }
    );
  }
}
