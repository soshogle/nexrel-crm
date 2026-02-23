import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDailyReport } from '@/lib/lead-generation/analytics';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/lead-generation/analytics/report
 * Generate daily report
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    
    const report = await generateDailyReport(session.user.id);
    
    return new Response(report, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    return apiErrors.internal('Failed to generate report');
  }
}
