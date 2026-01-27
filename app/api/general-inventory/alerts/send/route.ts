
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { lowStockAlertService } from '@/lib/low-stock-alert-service';

export const dynamic = 'force-dynamic';

// POST - Manually trigger alerts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await lowStockAlertService.sendAlerts(session.user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error sending alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send alerts' },
      { status: 500 }
    );
  }
}

// GET - Get low stock items without sending alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await lowStockAlertService.checkInventory(session.user.id);

    return NextResponse.json({
      success: true,
      items,
      totalCount: items.length,
      outOfStock: items.filter((i) => i.status === 'OUT_OF_STOCK').length,
      critical: items.filter((i) => i.status === 'CRITICAL').length,
      low: items.filter((i) => i.status === 'LOW').length,
    });
  } catch (error: any) {
    console.error('Error checking inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check inventory' },
      { status: 500 }
    );
  }
}
