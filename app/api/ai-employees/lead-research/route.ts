/**
 * API endpoint for triggering lead research
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadResearcher } from '@/lib/ai-employees/lead-researcher';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { leadService } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('[Lead Research API] POST request received');
  try {
    const session = await getServerSession(authOptions);
    console.log('[Lead Research API] Session:', session?.user?.id ? 'Found' : 'Not found');

    if (!session?.user?.id) {
      console.log('[Lead Research API] Unauthorized - no session');
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    console.log('[Lead Research API] Body:', JSON.stringify(body));
    const { leadId, businessName, website, industry } = body;

    if (!leadId && !businessName) {
      return apiErrors.badRequest('Either leadId or businessName is required');
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // If leadId is provided, fetch lead data
    let leadData;
    if (leadId) {
      leadData = await leadService.findUnique(ctx, leadId);

      if (!leadData) {
        return apiErrors.notFound('Lead not found');
      }

      if (leadData.userId !== session.user.id) {
        return apiErrors.forbidden('Unauthorized');
      }
    }

    // Start research asynchronously - returns immediately to avoid timeout (research takes 3-4 min)
    const { jobId } = await leadResearcher.startResearchAsync({
      userId: session.user.id,
      leadId: leadId || undefined,
      businessName: leadData?.businessName || businessName,
      website: leadData?.website || website,
      industry: industry || undefined
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Lead research started. Results will appear in your AI Jobs list.'
    });

  } catch (error: any) {
    console.error('Lead research API error:', error);
    return apiErrors.internal(error.message || 'Failed to start lead research');
  }
}
