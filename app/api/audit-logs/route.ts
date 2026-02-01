
/**
 * Audit Logs API Endpoint
 * Provides access to security audit logs for administrators
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuditLogs } from '@/lib/security/audit-logger';
import { RateLimiters, getClientIdentifier, createRateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizePagination, sanitizeSearchQuery } from '@/lib/security/input-sanitizer';
import { AuditAction, AuditSeverity } from '@prisma/client';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimitResult = RateLimiters.standard(request, `audit-logs:${clientId}`);
  
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult.resetIn);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const { page, limit } = sanitizePagination({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
    });

    const action = searchParams.get('action') as AuditAction | null;
    const severity = searchParams.get('severity') as AuditSeverity | null;
    const entityType = searchParams.get('entityType');
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    // Get audit logs
    const result = await getAuditLogs({
      action: action || undefined,
      severity: severity || undefined,
      entityType: entityType || undefined,
      startDate,
      endDate,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      logs: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
