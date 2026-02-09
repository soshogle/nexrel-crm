/**
 * Stock Synchronization API
 * Syncs inventory changes to websites in real-time
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const { productId, sku, quantity, previousQuantity } = body;

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'productId and quantity are required' },
        { status: 400 }
      );
    }

    const updates = await websiteStockSyncService.syncStockToWebsites({
      productId,
      sku: sku || '',
      quantity,
      previousQuantity: previousQuantity ?? quantity,
      websiteId: params.id,
    });

    return NextResponse.json({
      success: true,
      updates,
      message: `Stock synced to ${updates.length} website(s)`,
    });
  } catch (error: any) {
    console.error('Error syncing stock:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync stock' },
      { status: 500 }
    );
  }
}
