/**
 * Enhanced Call Handler
 * Combines Twilio + ElevenLabs + Workflows to replicate Mango Voice functionality
 * Features: Screen pops, patient matching, call routing, workflow automation
 */

import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';

export interface CallEvent {
  callSid: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'answered' | 'completed' | 'busy' | 'failed';
  timestamp: Date;
}

export interface PatientMatch {
  leadId: string;
  patientName: string;
  phoneNumber: string;
  matchConfidence: 'exact' | 'high' | 'medium' | 'low';
  recentAppointments?: any[];
  recentNotes?: any[];
  insuranceInfo?: any;
}

export class EnhancedCallHandler {
  /**
   * Match incoming call to patient record
   * This is the "screen pop" functionality
   */
  async matchPatientToCall(phoneNumber: string): Promise<PatientMatch | null> {
    try {
      // Normalize phone number (remove formatting)
      const normalized = phoneNumber.replace(/\D/g, '');
      
      // Try exact match first
      let lead = await prisma.lead.findFirst({
        where: {
          phone: {
            contains: normalized.slice(-10), // Last 10 digits
          },
        },
        include: {
          notes: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      });

      // If no exact match, try with country code variations
      if (!lead) {
        const variations = [
          `+1${normalized}`,
          `1${normalized}`,
          normalized,
          normalized.slice(-10),
        ];

        for (const variant of variations) {
          lead = await prisma.lead.findFirst({
            where: {
              OR: [
                { phone: { contains: variant } },
                { phone: { contains: variant.replace(/\D/g, '') } },
              ],
            },
            include: {
              notes: {
                orderBy: { createdAt: 'desc' },
                take: 3,
              },
            },
          });
          if (lead) break;
        }
      }

      if (!lead) {
        return null;
      }

      // Get recent appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          leadId: lead.id,
        },
        orderBy: { scheduledDate: 'desc' },
        take: 3,
      });

      // Determine match confidence
      const leadPhone = lead.phone?.replace(/\D/g, '') || '';
      const normalizedPhone = normalized.replace(/\D/g, '');
      let matchConfidence: 'exact' | 'high' | 'medium' | 'low' = 'low';
      
      if (leadPhone === normalizedPhone || leadPhone === normalizedPhone.slice(-10)) {
        matchConfidence = 'exact';
      } else if (leadPhone.includes(normalizedPhone.slice(-10)) || normalizedPhone.includes(leadPhone.slice(-10))) {
        matchConfidence = 'high';
      } else {
        matchConfidence = 'medium';
      }

      return {
        leadId: lead.id,
        patientName: lead.contactPerson || lead.businessName || 'Unknown',
        phoneNumber: lead.phone || phoneNumber,
        matchConfidence,
        recentAppointments: appointments,
        recentNotes: lead.notes || [],
        insuranceInfo: lead.insuranceInfo as any,
      };
    } catch (error) {
      console.error('Error matching patient to call:', error);
      return null;
    }
  }

  /**
   * Handle incoming call with screen pop
   */
  async handleIncomingCall(callEvent: CallEvent, clinicId?: string) {
    // Match patient
    const patientMatch = await this.matchPatientToCall(callEvent.fromNumber);

    // Create call log with patient match
    const callLog = await prisma.callLog.create({
      data: {
        twilioCallSid: callEvent.callSid,
        fromNumber: callEvent.fromNumber,
        toNumber: callEvent.callEvent.toNumber,
        direction: 'INBOUND',
        status: callEvent.status === 'answered' ? 'IN_PROGRESS' : 'RINGING',
        leadId: patientMatch?.leadId,
        metadata: {
          patientMatch: patientMatch ? {
            name: patientMatch.patientName,
            confidence: patientMatch.matchConfidence,
            hasRecentAppointments: (patientMatch.recentAppointments?.length || 0) > 0,
            hasRecentNotes: (patientMatch.recentNotes?.length || 0) > 0,
          } : null,
          clinicId,
        },
      },
    });

    // Trigger workflow if patient matched
    if (patientMatch && patientMatch.leadId) {
      try {
        // Find workflows triggered by incoming calls
        const workflows = await prisma.workflowTemplate.findMany({
          where: {
            userId: callLog.userId || undefined,
            triggers: {
              array_contains: ['INCOMING_CALL'],
            },
            isActive: true,
          },
        });

        // Execute workflows
        for (const workflow of workflows) {
          // This would trigger your workflow engine
          console.log(`Triggering workflow ${workflow.id} for incoming call`);
        }
      } catch (error) {
        console.error('Error triggering workflows:', error);
      }
    }

    return {
      callLog,
      patientMatch,
      screenPopData: patientMatch ? {
        patientName: patientMatch.patientName,
        recentAppointments: patientMatch.recentAppointments,
        recentNotes: patientMatch.recentNotes,
        insuranceInfo: patientMatch.insuranceInfo,
      } : null,
    };
  }

  /**
   * Route call based on rules (like Mango Voice routing)
   */
  async routeCall(
    callEvent: CallEvent,
    routingRules?: {
      timeOfDay?: { start: string; end: string };
      dayOfWeek?: string[];
      forwardTo?: string;
      voicemailEnabled?: boolean;
    }
  ) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday

    // Check time-based routing
    if (routingRules?.timeOfDay) {
      const [startHour, startMin] = routingRules.timeOfDay.start.split(':').map(Number);
      const [endHour, endMin] = routingRules.timeOfDay.end.split(':').map(Number);
      
      const currentTime = hour * 60 + now.getMinutes();
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (currentTime < startTime || currentTime > endTime) {
        // Outside business hours
        if (routingRules.voicemailEnabled) {
          return { action: 'voicemail' };
        }
        return { action: 'forward', number: routingRules.forwardTo };
      }
    }

    // Check day-based routing
    if (routingRules?.dayOfWeek && !routingRules.dayOfWeek.includes(day.toString())) {
      if (routingRules.voicemailEnabled) {
        return { action: 'voicemail' };
      }
      return { action: 'forward', number: routingRules.forwardTo };
    }

    // Default: connect to agent
    return { action: 'connect' };
  }

  /**
   * Send screen pop notification (for real-time display)
   * This would integrate with your frontend to show patient info
   */
  async sendScreenPopNotification(
    userId: string,
    patientMatch: PatientMatch,
    callInfo: CallEvent
  ) {
    // In a real implementation, this would use WebSockets or Server-Sent Events
    // to push data to the frontend in real-time
    console.log('Screen pop notification:', {
      userId,
      patient: patientMatch.patientName,
      phone: callInfo.fromNumber,
      callSid: callInfo.callSid,
    });

    // You could emit this via Socket.io or similar
    // socket.emit('screen-pop', { userId, patientMatch, callInfo });
  }
}

export const enhancedCallHandler = new EnhancedCallHandler();
