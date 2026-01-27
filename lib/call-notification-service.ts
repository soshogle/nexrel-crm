/**
 * Call Notification Service
 * Handles sending email notifications for completed calls
 * Uses existing call data from the database instead of webhooks
 */

import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';

export class CallNotificationService {
  /**
   * Process and send email notifications for completed calls
   * @param userId - Optional user ID to filter calls
   * @param limit - Maximum number of calls to process (default: 50)
   * @returns Results of the notification process
   */
  async sendPendingNotifications(userId?: string, limit: number = 50) {
    console.log('📧 [Call Notifications] Starting batch notification process...');
    console.log('   User ID:', userId || 'All users');
    console.log('   Limit:', limit);

    const whereClause: any = {
      status: 'COMPLETED',
      emailSent: false,
      voiceAgent: {
        sendRecordingEmail: true,
        recordingEmailAddress: { not: null }
      }
    };

    if (userId) {
      whereClause.userId = userId;
    }

    // Find completed calls that need email notifications
    const callLogs = await prisma.callLog.findMany({
      where: whereClause,
      include: {
        voiceAgent: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    console.log(`📋 [Call Notifications] Found ${callLogs.length} calls to process`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ callId: string; error: string }>
    };

    for (const callLog of callLogs) {
      try {
        const voiceAgent = callLog.voiceAgent;

        // Validate agent settings
        if (!voiceAgent || !voiceAgent.sendRecordingEmail || !voiceAgent.recordingEmailAddress) {
          results.skipped++;
          continue;
        }

        // Skip if no conversation data
        if (!callLog.transcription && !callLog.conversationData) {
          results.skipped++;
          continue;
        }

        // Send notification
        await this.sendNotificationForCall(callLog);

        // Mark as email sent
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: { emailSent: true, emailSentAt: new Date() }
        });

        console.log(`✅ [Call Notifications] Sent notification for call ${callLog.id}`);
        results.success++;
      } catch (error: any) {
        console.error(`❌ [Call Notifications] Failed to process call ${callLog.id}:`, error.message);
        results.failed++;
        results.errors.push({
          callId: callLog.id,
          error: error.message
        });
      }
    }

    console.log('📊 [Call Notifications] Batch processing complete:', results);
    return results;
  }

  /**
   * Send email notification for a specific call
   * @param callLog - Call log with voice agent included
   */
  async sendNotificationForCall(callLog: any) {
    const voiceAgent = callLog.voiceAgent;

    if (!voiceAgent?.sendRecordingEmail || !voiceAgent?.recordingEmailAddress) {
      throw new Error('Email notifications not configured for this agent');
    }

    // Extract AI summary and call reason
    let aiSummary = '';
    let callReason = '';
    try {
      const convData = JSON.parse(callLog.conversationData || '{}');
      aiSummary = convData.analysis?.summary || convData.summary || '';

      if (convData.analysis?.call_purpose) {
        callReason = convData.analysis.call_purpose;
      } else if (convData.metadata?.purpose) {
        callReason = convData.metadata.purpose;
      } else if (aiSummary) {
        const firstSentence = aiSummary.split('.')[0];
        if (firstSentence.length > 0 && firstSentence.length < 150) {
          callReason = firstSentence + '.';
        }
      }
    } catch (e) {
      console.log('⚠️  Could not parse conversation data');
    }

    // Look up caller information
    let callerName = callLog.fromNumber || 'Unknown';
    let callerEmail = undefined;

    try {
      const cleanPhone = (callLog.fromNumber || '').replace(/[\s\-\+\(\)]/g, '');
      const lead = await prisma.lead.findFirst({
        where: {
          userId: voiceAgent.userId,
          phone: {
            contains: cleanPhone.slice(-10)
          }
        }
      });

      if (lead) {
        callerName = lead.contactPerson || lead.businessName || callLog.fromNumber || 'Unknown';
        callerEmail = lead.email || undefined;
      }
    } catch (error: any) {
      console.log('⚠️  Could not lookup caller:', error.message);
    }

    // Format call duration
    const durationSecs = callLog.duration || 0;
    const minutes = Math.floor(durationSecs / 60);
    const seconds = durationSecs % 60;
    const formattedDuration = `${minutes}m ${seconds}s`;

    // Get recording URL
    const recordingUrl = callLog.recordingUrl
      ? `${process.env.NEXTAUTH_URL}${callLog.recordingUrl}`
      : undefined;

    // Send the email
    await emailService.sendCallSummaryEmail({
      recipientEmail: voiceAgent.recordingEmailAddress,
      callerName: callerName,
      callerPhone: callLog.fromNumber || 'Unknown',
      callerEmail: callerEmail,
      callReason: callReason || undefined,
      agentName: voiceAgent.name || 'AI Agent',
      callDuration: formattedDuration,
      callDate: callLog.createdAt || new Date(),
      transcript: callLog.transcription || undefined,
      summary: aiSummary || undefined,
      recordingUrl: recordingUrl,
      userId: voiceAgent.userId
    });
  }

  /**
   * Get statistics about pending notifications
   * @param userId - Optional user ID to filter
   */
  async getNotificationStats(userId?: string) {
    const whereClause: any = {
      status: 'COMPLETED'
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const [pendingCount, totalCompleted, emailsSent] = await Promise.all([
      // Pending notifications
      prisma.callLog.count({
        where: {
          ...whereClause,
          emailSent: false,
          voiceAgent: {
            sendRecordingEmail: true,
            recordingEmailAddress: { not: null }
          }
        }
      }),
      // Total completed calls
      prisma.callLog.count({
        where: whereClause
      }),
      // Emails already sent
      prisma.callLog.count({
        where: {
          ...whereClause,
          emailSent: true
        }
      })
    ]);

    return {
      pendingCount,
      totalCompleted,
      emailsSent,
      percentage: totalCompleted > 0 ? Math.round((emailsSent / totalCompleted) * 100) : 0
    };
  }

  /**
   * Resend notification for a specific call
   * @param callLogId - ID of the call log
   */
  async resendNotification(callLogId: string) {
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: {
        voiceAgent: {
          include: { user: true }
        }
      }
    });

    if (!callLog) {
      throw new Error('Call log not found');
    }

    if (callLog.status !== 'COMPLETED') {
      throw new Error('Cannot send notification for incomplete call');
    }

    await this.sendNotificationForCall(callLog);

    // Update sent status
    await prisma.callLog.update({
      where: { id: callLogId },
      data: { emailSent: true, emailSentAt: new Date() }
    });

    return { success: true };
  }
}

// Export singleton instance
export const callNotificationService = new CallNotificationService();
