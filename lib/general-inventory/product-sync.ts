/**
 * Syncs General Inventory stock changes to Product (e-commerce) and website sales.
 * When you update stock in General Inventory, this updates Product.inventory and
 * syncs to all websites that have the product.
 */

import { prisma } from '@/lib/db';
import { websiteStockSyncService } from '@/lib/website-builder/stock-sync-service';

/**
 * Sync General Inventory quantity to Product and website stock.
 * Call this after any General Inventory quantity change (adjustments, item creation).
 */
export async function syncGeneralInventoryToProduct(
  userId: string,
  sku: string,
  quantityAfter: number,
  previousQuantity?: number
): Promise<{ synced: boolean; productId?: string }> {
  try {
    // Find Product by SKU and userId
    const product = await prisma.product.findFirst({
      where: {
        userId,
        sku,
      },
    });

    if (!product) {
      return { synced: false };
    }

    const prevQty = previousQuantity ?? product.inventory;

    // Update Product.inventory
    await prisma.product.update({
      where: { id: product.id },
      data: {
        inventory: Math.max(0, quantityAfter),
      },
    });

    // Sync to all websites that have this product
    await websiteStockSyncService.syncStockToWebsites({
      productId: product.id,
      sku: product.sku,
      quantity: Math.max(0, quantityAfter),
      previousQuantity: prevQty,
    });

    return { synced: true, productId: product.id };
  } catch (error) {
    console.error('[ProductSync] Failed to sync General Inventory to Product:', error);
    return { synced: false };
  }
}
