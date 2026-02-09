/**
 * Website Stock Management API
 * Handles stock synchronization and status for websites
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteStockSyncService } from '@/lib/website-builder/stock-sync-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await websiteStockSyncService.getWebsiteStockStatus(params.id);
    const healthScore = await websiteStockSyncService.calculateInventoryHealthScore(params.id);

    return NextResponse.json({
      success: true,
      status: {
        ...status,
        healthScore,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock status' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lowStockThreshold, outOfStockAction, syncInventory, autoHideOutOfStock } = body;

    const settings = await websiteStockSyncService.updateStockSettings(params.id, {
      lowStockThreshold,
      outOfStockAction,
      syncInventory,
      autoHideOutOfStock,
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Error updating stock settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update stock settings' },
      { status: 500 }
    );
  }
}
