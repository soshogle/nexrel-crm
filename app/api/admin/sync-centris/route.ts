/**
 * POST /api/admin/sync-centris
 * Manually trigger the full Centris/Realtor sync (same as cron).
 * SUPER_ADMIN only. Use when you need to run sync outside the daily schedule.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const role = (session.user as { role?: string }).role;
    if (role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Sync MLS is restricted to super admins');
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured. Sync cannot run.' },
        { status: 500 }
      );
    }

    const res = await fetch(`${baseUrl}/api/cron/sync-centris`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || 'Sync failed', status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Centris/Realtor sync completed',
      ...data,
    });
  } catch (error) {
    console.error('[admin/sync-centris]', error);
    return apiErrors.internal('Failed to trigger sync');
  }
}
