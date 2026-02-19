/**
 * Health check endpoint for load balancers, monitoring, and deployments.
 * GET /api/health - Returns 200 if DB is reachable, 503 if not.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  try {
    // Database check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Health check: database failed', { error: message });
    checks.database = { status: 'error', error: message };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const status = allOk ? 200 : 503;
  const body = {
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    checks,
  };

  return NextResponse.json(body, { status });
}
