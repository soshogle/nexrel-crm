
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPlatformClient } from '@/lib/ecommerce-platforms';

export const dynamic = 'force-dynamic';

// POST - Push inventory changes to external platform
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, action } = body;

    if (!itemId || !action) {
      return NextResponse.json(
        { error: 'Item ID and action are required' },
        { status: 400 }
      );
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
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get sync settings
    const settings = await prisma.ecommerceSyncSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings || !settings.autoSync) {
      return NextResponse.json(
        { error: 'E-commerce sync is not enabled' },
        { status: 400 }
      );
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
          return NextResponse.json(
            { error: 'Inventory sync is not enabled' },
            { status: 400 }
          );
        }
        result = await client.updateInventory(item.sku, item.quantity);
        break;

      case 'update_product':
        if (!settings.syncProducts) {
          return NextResponse.json(
            { error: 'Product sync is not enabled' },
            { status: 400 }
          );
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
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
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
    return NextResponse.json(
      { error: error.message || 'Failed to push changes' },
      { status: 500 }
    );
  }
}
