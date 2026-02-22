import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  scoreAndSaveLead,
  batchScoreLeads,
  getLeadScoreHistory
} from '@/lib/lead-generation/lead-scoring-db';
import { leadService } from '@/lib/dal';

/**
 * POST /api/lead-generation/score
 * Score a single lead or batch score multiple leads
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Single lead scoring
    if (body.leadId) {
      const result = await scoreAndSaveLead(
        body.leadId,
        session.user.id,
        (session.user as any).industry ?? null
      );
      
      return NextResponse.json({
        success: true,
        leadId: body.leadId,
        score: result.score,
        breakdown: result.breakdown,
        routing: result.routing
      });
    }
    
    // Batch scoring
    if (body.batch) {
      const result = await batchScoreLeads(
        session.user.id,
        body.filter,
        (session.user as any).industry ?? null
      );
      
      return NextResponse.json({
        success: true,
        processed: result.processed,
        updated: result.updated,
        errors: result.errors
      });
    }
    
    return NextResponse.json(
      { error: 'Missing leadId or batch parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error scoring lead:', error);
    return NextResponse.json(
      { error: 'Failed to score lead' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lead-generation/score?leadId=xxx
 * Get lead score history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Missing leadId parameter' },
        { status: 400 }
      );
    }
    
    const ctx = {
      userId: session.user.id,
      industry: (session.user as any).industry ?? null
    };

    // Get lead score history
    const scores = await getLeadScoreHistory(leadId, ctx.userId, ctx.industry);

    // Get current lead data
    const lead = await leadService.findUnique(ctx, leadId, undefined);

    return NextResponse.json({
      success: true,
      lead: lead
        ? {
            id: lead.id,
            businessName: lead.businessName,
            leadScore: lead.leadScore,
            nextAction: lead.nextAction,
            nextActionDate: lead.nextActionDate
          }
        : null,
      history: scores
    });
  } catch (error) {
    console.error('Error fetching lead score:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead score' },
      { status: 500 }
    );
  }
}
