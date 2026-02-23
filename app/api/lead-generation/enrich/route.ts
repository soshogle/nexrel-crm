import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enrichLead, batchEnrichLeads } from '@/lib/lead-generation/data-enrichment';
import { apiErrors } from '@/lib/api-error';

/**
 * POST /api/lead-generation/enrich
 * Enrich lead data using external APIs
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    
    const body = await request.json();
    
    // Single lead enrichment
    if (body.leadId) {
      const result = await enrichLead(body.leadId, {
        skipCache: body.skipCache,
        findEmail: body.findEmail,
        findCompanyInfo: body.findCompanyInfo
      });
      
      return NextResponse.json({
        success: result.success,
        data: result.data,
        source: result.source,
        cached: result.cached,
        error: result.error
      });
    }
    
    // Batch enrichment
    if (body.leadIds && Array.isArray(body.leadIds)) {
      const result = await batchEnrichLeads(body.leadIds, {
        skipCache: body.skipCache,
        findEmail: body.findEmail,
        findCompanyInfo: body.findCompanyInfo
      });
      
      return NextResponse.json({
        success: true,
        ...result
      });
    }
    
    return apiErrors.badRequest('Missing leadId or leadIds parameter');
  } catch (error) {
    console.error('Error enriching lead:', error);
    return apiErrors.internal('Failed to enrich lead');
  }
}
