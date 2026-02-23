import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateLeadScoreOnEvent } from '@/lib/lead-generation/lead-scoring-db';
import { apiErrors } from '@/lib/api-error';

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
      return apiErrors.unauthorized();
    }
    
    const body = await request.json();
    const { leadId, eventType, data } = body;
    
    if (!leadId || !eventType) {
      return apiErrors.badRequest('Missing leadId or eventType');
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
      return apiErrors.badRequest('Invalid event type');
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
    return apiErrors.internal('Failed to update lead score');
  }
}
