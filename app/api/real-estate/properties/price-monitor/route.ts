/**
 * POST /api/real-estate/properties/price-monitor
 *   Triggers price monitoring — scrapes Centris/Google for current prices
 *   and detects changes vs stored CRM data.
 *
 * GET /api/real-estate/properties/price-monitor
 *   Returns recent price changes for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runPriceMonitor, getRecentPriceChanges } from '@/lib/listing-enrichment/price-monitor';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 50, 100);

    const result = await runPriceMonitor(session.user.id, {
      limit,
      verbose: true,
    });

    return NextResponse.json({
      success: true,
      checked: result.checked,
      priceChanges: result.priceChanges,
      errors: result.errors,
      changes: result.changes,
      durationMs: result.durationMs,
      message: result.priceChanges > 0
        ? `Found ${result.priceChanges} price change(s) across ${result.checked} listings.`
        : `Checked ${result.checked} listings — no price changes detected.`,
    });
  } catch (error: any) {
    console.error('Price monitor error:', error);
    return apiErrors.internal(error.message || 'Price monitor failed');
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const changes = await getRecentPriceChanges(session.user.id, 100);

    return NextResponse.json({
      success: true,
      changes,
      total: changes.length,
    });
  } catch (error: any) {
    console.error('Price changes fetch error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch price changes');
  }
}
