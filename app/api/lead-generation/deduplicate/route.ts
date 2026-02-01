import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { batchDeduplicateLeads, findPotentialDuplicates } from '@/lib/lead-generation/deduplication';

/**
 * POST /api/lead-generation/deduplicate
 * Batch deduplicate leads
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
    
    console.log(`[DEDUPE] Starting deduplication for user ${session.user.id}...`);
    
    const result = await batchDeduplicateLeads(session.user.id);
    
    console.log('[DEDUPE] Deduplication completed:', result);
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[DEDUPE] Error in deduplication:', error);
    return NextResponse.json(
      { 
        error: 'Failed to deduplicate leads',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lead-generation/deduplicate?review=true
 * Find potential duplicates for manual review
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
    const review = searchParams.get('review') === 'true';
    const threshold = parseFloat(searchParams.get('threshold') || '0.85');
    
    if (review) {
      console.log(`[DEDUPE] Finding potential duplicates (threshold: ${threshold})...`);
      
      const duplicates = await findPotentialDuplicates(session.user.id, threshold);
      
      console.log(`[DEDUPE] Found ${duplicates.length} potential duplicates`);
      
      return NextResponse.json({
        success: true,
        count: duplicates.length,
        duplicates
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Use POST to deduplicate, or GET with ?review=true to find potential duplicates'
    });
  } catch (error) {
    console.error('[DEDUPE] Error finding duplicates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to find duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
