/**
 * Mango Voice Webhook Handler
 * Receives webhook events from Mango Voice PBX system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMangoVoiceService } from '@/lib/integrations/mango-voice';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const mangoVoice = createMangoVoiceService();

    if (!mangoVoice) {
      return apiErrors.internal('Mango Voice integration not configured');
    }

    // Handle webhook event
    const event = await mangoVoice.handleWebhook(payload);

    if (!event) {
      return apiErrors.badRequest('Invalid webhook payload');
    }

    // Match phone number to patient/lead
    const patientId = await mangoVoice.matchPatient(
      event.direction === 'inbound' ? event.fromNumber : event.toNumber
    );

    // Create call log entry
    if (event.eventType === 'call_ended') {
      await (prisma as any).callLog.create({
        data: {
          userId: patientId ? undefined : undefined,
          leadId: patientId || undefined,
          direction: event.direction.toUpperCase() as 'INBOUND' | 'OUTBOUND',
          status: 'COMPLETED',
          fromNumber: event.fromNumber,
          toNumber: event.toNumber,
          duration: event.duration || 0,
          recordingUrl: event.recordingUrl || null,
          metadata: {
            mangoVoiceCallId: event.callId,
            eventType: event.eventType,
            timestamp: event.timestamp,
          },
        },
      });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('Error handling Mango Voice webhook:', error);
    return apiErrors.internal('Failed to process webhook');
  }
}
