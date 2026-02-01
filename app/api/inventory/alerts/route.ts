
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET STOCK ALERTS
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isResolved = searchParams.get('isResolved');
    const alertType = searchParams.get('alertType');
    const severity = searchParams.get('severity');

    const where: any = { userId: session.user.id };

    if (isResolved !== null) {
      where.isResolved = isResolved === 'true';
    }

    if (alertType) {
      where.alertType = alertType;
    }

    if (severity) {
      where.severity = severity;
    }

    const alerts = await prisma.stockAlert.findMany({
      where,
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true,
            minimumStock: true,
            unit: true,
          },
        },
      },
      orderBy: [
        { isResolved: 'asc' },
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('❌ Alerts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

/**
 * MARK ALERT AS RESOLVED
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { alertIds } = body;

    if (!alertIds || !Array.isArray(alertIds)) {
      return NextResponse.json(
        { error: 'Alert IDs are required' },
        { status: 400 }
      );
    }

    await prisma.stockAlert.updateMany({
      where: {
        id: { in: alertIds },
        userId: session.user.id,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Alert resolution error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alerts' },
      { status: 500 }
    );
  }
}
