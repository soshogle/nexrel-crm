import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateLeadScoreOnEvent } from '@/lib/lead-generation/lead-scoring-db';

/**
 * POST /api/lead-generation/score/event
 * Update lead score based on engagement event
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
    const { leadId, eventType, data } = body;
    
    if (!leadId || !eventType) {
      return NextResponse.json(
        { error: 'Missing leadId or eventType' },
        { status: 400 }
      );
    }
    
    // Validate event type
    const validEvents = [
      'email_opened',
      'email_clicked',
      'email_replied',
      'sms_replied',
      'call_answered',
      'form_submitted'
    ];
    
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }
    
    // Update score
    const result = await updateLeadScoreOnEvent(
      leadId,
      session.user.id,
      {
        type: eventType,
        data
      },
      (session.user as any).industry ?? null
    );
    
    return NextResponse.json({
      success: true,
      leadId,
      eventType,
      score: result.score,
      breakdown: result.breakdown,
      routing: result.routing
    });
  } catch (error) {
    console.error('Error updating lead score on event:', error);
    return NextResponse.json(
      { error: 'Failed to update lead score' },
      { status: 500 }
    );
  }
}
