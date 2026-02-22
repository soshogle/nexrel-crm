import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { createDalContext } from '@/lib/context/industry-context';
import { leadService } from '@/lib/dal/lead-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Send email notifications for completed calls
 * This endpoint processes completed calls and sends email notifications
 * based on voice agent settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { callLogId, sendAll } = body;

    console.log('📧 [Send Notifications] Starting email notification process...');
    console.log('   User ID:', session.user.id);
    console.log('   Call Log ID:', callLogId || 'All pending');
    console.log('   Send All:', sendAll);

    let callLogs;

    if (callLogId) {
      // Send notification for a specific call
      const callLog = await prisma.callLog.findUnique({
        where: { id: callLogId },
        include: {
          voiceAgent: {
            include: { user: true }
          }
        }
      });

      if (!callLog) {
        return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
      }

      // Verify ownership
      if (callLog.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      callLogs = [callLog];
    } else {
      // Send notifications for all pending calls
      callLogs = await prisma.callLog.findMany({
        where: {
          userId: session.user.id,
          status: 'COMPLETED',
          emailSent: sendAll ? undefined : false, // If sendAll, ignore emailSent flag
          voiceAgent: {
            sendRecordingEmail: true,
            recordingEmailAddress: { not: null }
          }
        },
        include: {
          voiceAgent: {
            include: { user: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: sendAll ? 100 : 50 // Limit to prevent overwhelming
      });
    }

    console.log(`📋 [Send Notifications] Found ${callLogs.length} calls to process`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const callLog of callLogs) {
      try {
        const voiceAgent = callLog.voiceAgent;

        // Skip if agent settings don't allow emails
        if (!voiceAgent || !voiceAgent.sendRecordingEmail || !voiceAgent.recordingEmailAddress) {
          console.log(`⏭️  [Send Notifications] Skipping call ${callLog.id} - email not configured`);
          results.skipped++;
          continue;
        }

        // Skip if no conversation data or transcript
        if (!callLog.transcription && !callLog.conversationData) {
          console.log(`⏭️  [Send Notifications] Skipping call ${callLog.id} - no transcript/conversation data`);
          results.skipped++;
          continue;
        }

        console.log(`📧 [Send Notifications] Processing call ${callLog.id}...`);

        // Extract data from call log
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
          console.log('⚠️  Could not parse conversation data for AI summary');
        }

        // Try to find caller in Leads database
        let callerName = callLog.fromNumber || 'Unknown';
        let callerEmail = undefined;

        try {
          const ctx = createDalContext(voiceAgent.userId);
          const cleanPhone = (callLog.fromNumber || '').replace(/[\s\-\+\(\)]/g, '');
          const leads = await leadService.findMany(ctx, {
            where: { phone: { contains: cleanPhone.slice(-10) } },
            take: 1
          });
          const lead = leads[0];

          if (lead) {
            callerName = lead.contactPerson || lead.businessName || callLog.fromNumber || 'Unknown';
            callerEmail = lead.email || undefined;
          }
        } catch (lookupError: any) {
          console.log('⚠️  Could not lookup caller:', lookupError.message);
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
          recipientEmail: voiceAgent.recordingEmailAddress!,
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

        // Mark as email sent
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: { emailSent: true, emailSentAt: new Date() }
        });

        console.log(`✅ [Send Notifications] Email sent for call ${callLog.id}`);
        results.success++;
      } catch (error: any) {
        console.error(`❌ [Send Notifications] Failed to process call ${callLog.id}:`, error.message);
        results.failed++;
        results.errors.push(`Call ${callLog.id}: ${error.message}`);
      }
    }

    console.log('📊 [Send Notifications] Results:', results);

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('❌ [Send Notifications] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get status of pending email notifications
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count calls pending email notification
    const pendingCount = await prisma.callLog.count({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        emailSent: false,
        voiceAgent: {
          sendRecordingEmail: true,
          recordingEmailAddress: { not: null }
        }
      }
    });

    // Count total completed calls
    const totalCompleted = await prisma.callLog.count({
      where: {
        userId: session.user.id,
        status: 'COMPLETED'
      }
    });

    // Count emails sent
    const emailsSent = await prisma.callLog.count({
      where: {
        userId: session.user.id,
        emailSent: true
      }
    });

    return NextResponse.json({
      pendingCount,
      totalCompleted,
      emailsSent
    });
  } catch (error: any) {
    console.error('❌ [Get Notifications Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
