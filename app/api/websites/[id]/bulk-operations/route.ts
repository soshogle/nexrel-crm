/**
 * Bulk Operations API
 * Perform bulk operations on products and stock
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { websiteStockSyncService } from '@/lib/website-builder/stock-sync-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operation, productIds, data } = body;

    if (!operation || !productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'operation and productIds array are required' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    const errors: string[] = [];

    switch (operation) {
      case 'update_visibility':
        // Bulk update product visibility
        for (const productId of productIds) {
          try {
            await prisma.websiteProduct.updateMany({
              where: {
                websiteId: params.id,
                productId,
              },
              data: {
                isVisible: data.isVisible !== false,
              },
            });
            results.push({ productId, success: true });
          } catch (error: any) {
            errors.push(`Product ${productId}: ${error.message}`);
            results.push({ productId, success: false, error: error.message });
          }
        }
        break;

      case 'update_stock':
        // Bulk update stock (requires product updates)
        for (const item of productIds) {
          const productId = typeof item === 'string' ? item : item.productId;
          const quantity = typeof item === 'object' ? item.quantity : data.quantity;

          try {
            const product = await prisma.product.findUnique({
              where: { id: productId },
              select: { inventory: true, sku: true },
            });

            if (product) {
              const previousQuantity = product.inventory;
              await prisma.product.update({
                where: { id: productId },
                data: { inventory: quantity },
              });

              // Sync to websites
              await websiteStockSyncService.syncStockToWebsites({
                productId,
                sku: product.sku,
                quantity,
                previousQuantity,
                websiteId: params.id,
              });

              results.push({ productId, success: true, previousQuantity, newQuantity: quantity });
            }
          } catch (error: any) {
            errors.push(`Product ${productId}: ${error.message}`);
            results.push({ productId, success: false, error: error.message });
          }
        }
        break;

      case 'remove_products':
        // Bulk remove products from website
        for (const productId of productIds) {
          try {
            await prisma.websiteProduct.deleteMany({
              where: {
                websiteId: params.id,
                productId,
              },
            });
            results.push({ productId, success: true });
          } catch (error: any) {
            errors.push(`Product ${productId}: ${error.message}`);
            results.push({ productId, success: false, error: error.message });
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Supported: update_visibility, update_stock, remove_products' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      operation,
      total: productIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
