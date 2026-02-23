
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createCashReconciliation,
  getCashReconciliations,
  calculateReconciliationSummary,
} from '@/lib/payments/cash-service';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/payments/cash/reconciliation
 * List cash reconciliations with optional filters
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const merchantId = searchParams.get('merchantId');

    const filters: any = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (merchantId) filters.merchantId = merchantId;

    const reconciliations = await getCashReconciliations(session.user.id, filters);

    return NextResponse.json({
      success: true,
      reconciliations,
      count: reconciliations.length,
    });
  } catch (error: any) {
    console.error('Error fetching cash reconciliations:', error);
    return apiErrors.internal('Failed to fetch cash reconciliations', error.message);
  }
}

/**
 * POST /api/payments/cash/reconciliation
 * Create a new cash reconciliation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { startDate, endDate, startingCash, actualCash, notes, merchantId, metadata } = body;

    // Validation
    if (!startDate || !endDate || actualCash === undefined) {
      return apiErrors.badRequest('Start date, end date, and actual cash are required');
    }

    // Convert amounts to cents
    const startingCashInCents = Math.round((startingCash || 0) * 100);
    const actualCashInCents = Math.round(actualCash * 100);

    const reconciliation = await createCashReconciliation({
      userId: session.user.id,
      merchantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startingCash: startingCashInCents,
      actualCash: actualCashInCents,
      notes,
      createdBy: session.user.id,
      metadata,
    });

    return NextResponse.json({
      success: true,
      reconciliation,
      message: 'Cash reconciliation created successfully',
    });
  } catch (error: any) {
    console.error('Error creating cash reconciliation:', error);
    return apiErrors.internal('Failed to create cash reconciliation', error.message);
  }
}
