
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPlatformClient } from '@/lib/ecommerce-platforms';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Push inventory changes to external platform
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { itemId, action } = body;

    if (!itemId || !action) {
      return apiErrors.badRequest('Item ID and action are required');
    }

    // Get item details
    const item = await prisma.generalInventoryItem.findUnique({
      where: { id: itemId, userId: session.user.id },
      include: {
        category: true,
        supplier: true,
        location: true,
      },
    });

    if (!item) {
      return apiErrors.notFound('Item not found');
    }

    // Get sync settings
    const settings = await prisma.ecommerceSyncSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings || !settings.autoSync) {
      return apiErrors.badRequest('E-commerce sync is not enabled');
    }

    // Create platform client
    const client = createPlatformClient(settings.platform as 'shopify' | 'woocommerce', {
      shopifyDomain: settings.shopifyDomain || undefined,
      shopifyAccessToken: settings.shopifyAccessToken || undefined,
      woocommerceUrl: settings.woocommerceUrl || undefined,
      woocommerceConsumerKey: settings.woocommerceConsumerKey || undefined,
      woocommerceConsumerSecret: settings.woocommerceConsumerSecret || undefined,
    });

    let result;

    // Perform the requested action
    switch (action) {
      case 'update_inventory':
        if (!settings.syncInventory) {
          return apiErrors.badRequest('Inventory sync is not enabled');
        }
        result = await client.updateInventory(item.sku, item.quantity);
        break;

      case 'update_product':
        if (!settings.syncProducts) {
          return apiErrors.badRequest('Product sync is not enabled');
        }
        result = await client.updateProduct(item.sku, {
          name: item.name,
          description: item.description || undefined,
          price: settings.syncPrices ? (item.sellingPrice || undefined) : undefined,
          quantity: item.quantity,
          barcode: item.barcode || undefined,
          imageUrl: item.imageUrl || undefined,
          category: item.category?.name || undefined,
        });
        break;

      default:
        return apiErrors.badRequest('Invalid action');
    }

    // Update last sync time
    await prisma.ecommerceSyncSettings.update({
      where: { id: settings.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      platform: settings.platform,
      action,
      sku: item.sku,
      result,
    });
  } catch (error: any) {
    console.error('Error pushing to e-commerce platform:', error);
    return apiErrors.internal(error.message || 'Failed to push changes');
  }
}
