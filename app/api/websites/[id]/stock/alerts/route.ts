/**
 * Low Stock Alerts API
 * Get and manage low stock alerts for a website
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, websiteService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteStockSyncService } from '@/lib/website-builder/stock-sync-service';
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    // Get website to verify ownership
    const website = await websiteService.findUnique(ctx, params.id);

    if (!website || website.userId !== session.user.id) {
      return apiErrors.notFound('Website not found');
    }

    // Get products needing restock
    let productsNeedingRestock: any[] = [];
    try {
      productsNeedingRestock = await websiteStockSyncService.getProductsNeedingRestock(
        params.id
      );
    } catch (e) {
      console.warn('getProductsNeedingRestock failed:', e);
    }

    // Get recent low stock alerts (from tasks)
    let alertTasks: any[] = [];
    try {
      const db = getCrmDb(ctx);
      const allAlerts = await db.task.findMany({
        where: {
          userId: ctx.userId,
          status: { in: ['TODO', 'IN_PROGRESS'] as any },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      alertTasks = allAlerts.filter(
        (t: any) =>
          t.metadata &&
          typeof t.metadata === 'object' &&
          t.metadata.type === 'LOW_STOCK_ALERT' &&
          t.metadata.websiteId === params.id
      );
    } catch (e) {
      console.warn('Failed to fetch alert tasks:', e);
    }

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
    return apiErrors.internal(error.message || 'Failed to fetch stock alerts');
  }
}
