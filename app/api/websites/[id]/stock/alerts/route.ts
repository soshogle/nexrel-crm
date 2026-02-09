/**
 * Low Stock Alerts API
 * Get and manage low stock alerts for a website
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

    // Get website to verify ownership
    const website = await prisma.website.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!website || website.userId !== session.user.id) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Get products needing restock
    const productsNeedingRestock = await websiteStockSyncService.getProductsNeedingRestock(
      params.id
    );

    // Get recent low stock alerts (from tasks)
    const alertTasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        metadata: {
          path: ['type'],
          equals: 'LOW_STOCK_ALERT',
        },
        metadata: {
          path: ['websiteId'],
          equals: params.id,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      alerts: {
        productsNeedingRestock,
        notifications: alertTasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          metadata: t.metadata,
          priority: t.priority,
          createdAt: t.createdAt,
          dueDate: t.dueDate,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock alerts' },
      { status: 500 }
    );
  }
}
