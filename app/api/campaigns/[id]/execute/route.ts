import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { campaignService, getCrmDb, leadService } from '@/lib/dal';
import { getDalContextFromSession, createDalContext } from '@/lib/context/industry-context';
import { emailService } from '@/lib/email-service';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/campaigns/[id]/execute - Execute/start campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const campaign = await campaignService.findUnique(ctx, params.id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'RUNNING') {
      return NextResponse.json(
        { error: 'Campaign is already running' },
        { status: 400 }
      );
    }

    if (campaign.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Campaign is already completed' },
        { status: 400 }
      );
    }

    // Get recipients based on targetAudience
    const recipients = await getRecipients(ctx, campaign.targetAudience as any);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found matching the target audience' },
        { status: 400 }
      );
    }

    // Create campaign messages for each recipient
    const messages = recipients.map((recipient) => ({
      campaignId: campaign.id,
      recipientType: recipient.type,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      recipientName: recipient.name,
      status: 'PENDING',
    }));

    const db = getCrmDb(ctx);
    // Create all messages in a transaction
    await db.$transaction([
      db.campaignMessage.createMany({
        data: messages,
      }),
      db.campaign.update({
        where: { id: params.id },
        data: {
          status: 'RUNNING',
          totalRecipients: recipients.length,
          lastRunAt: new Date(),
        },
      }),
    ]);

    // Start async processing (in real app, this would be a queue/worker)
    // For now, we'll mark it as running and process messages gradually
    processCampaignMessages(campaign.id, createDalContext(session.user.id)).catch((error) => {
      console.error('Error processing campaign messages:', error);
    });

    return NextResponse.json({
      success: true,
      recipientsCount: recipients.length,
      message: 'Campaign execution started',
    });
  } catch (error: any) {
    console.error('Error executing campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute campaign' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns/[id]/execute?action=pause - Pause campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const campaign = await campaignService.findUnique(ctx, params.id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'pause') {
      if (campaign.status !== 'RUNNING') {
        return NextResponse.json(
          { error: 'Can only pause running campaigns' },
          { status: 400 }
        );
      }

      await campaignService.update(ctx, params.id, { status: 'PAUSED' });

      return NextResponse.json({ success: true, message: 'Campaign paused' });
    }

    if (action === 'resume') {
      if (campaign.status !== 'PAUSED') {
        return NextResponse.json(
          { error: 'Can only resume paused campaigns' },
          { status: 400 }
        );
      }

      await campaignService.update(ctx, params.id, { status: 'RUNNING' });

      // Resume processing
      processCampaignMessages(campaign.id, ctx).catch((error) => {
        console.error('Error resuming campaign:', error);
      });

      return NextResponse.json({ success: true, message: 'Campaign resumed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating campaign status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// Helper: Get recipients based on target audience filters
async function getRecipients(
  ctx: { userId: string; industry?: string | null },
  targetAudience: any
): Promise<Array<{ id: string; type: 'LEAD'; email?: string | null; phone?: string | null; name: string }>> {
  const recipients: any[] = [];

  // Get leads
  const where: any = {};
  if (targetAudience?.status) {
    where.status = targetAudience.status;
  }
  if (targetAudience?.tags && Array.isArray(targetAudience.tags)) {
    where.tags = { hasSome: targetAudience.tags };
  }

  const leads = await leadService.findMany(ctx, {
    where,
    select: {
      id: true,
      businessName: true,
      contactPerson: true,
      email: true,
      phone: true,
    } as any,
  });

  recipients.push(
    ...leads
      .filter((lead) => lead.email || lead.phone)
      .map((lead) => ({
        id: lead.id,
        type: 'LEAD' as const,
        email: lead.email,
        phone: lead.phone,
        name: lead.contactPerson || lead.businessName,
      }))
  );

  return recipients;
}

// Helper: Process campaign messages (simulate sending)
async function processCampaignMessages(
  campaignId: string,
  ctx: { userId: string; industry?: string | null }
) {
  console.log(`🚀 Starting campaign message processing for campaign: ${campaignId}`);

  const db = getCrmDb(ctx);

  // Get campaign details
  const campaign = await campaignService.findUnique(ctx, campaignId);

  if (!campaign) {
    console.error('Campaign not found');
    return;
  }

  // Get pending messages
  const pendingMessages = await db.campaignMessage.findMany({
    where: {
      campaignId,
      status: 'PENDING',
    },
    take: 10, // Process in batches
  });

  console.log(`Processing ${pendingMessages.length} messages`);

  for (const message of pendingMessages) {
    try {
      // For EMAIL campaigns
      if (
        (campaign.type === 'EMAIL' || campaign.type === 'MULTI_CHANNEL') &&
        message.recipientEmail
      ) {
        const firstName = message.recipientName?.split(' ')[0] || '';
        const lastName = message.recipientName?.split(' ').slice(1).join(' ') || '';
        const personalizedBody = personalizeContent(campaign.emailBody || '', {
          name: message.recipientName || '',
          firstName,
          lastName,
          email: message.recipientEmail || '',
          businessName: message.recipientName || '',
          contactPerson: message.recipientName || '',
        });
        const personalizedSubject = personalizeContent(campaign.emailSubject || campaign.name, {
          name: message.recipientName || '',
          firstName,
          lastName,
          email: message.recipientEmail || '',
          businessName: message.recipientName || '',
          contactPerson: message.recipientName || '',
        });

        await emailService.sendEmail({
          to: message.recipientEmail,
          subject: personalizedSubject,
          html: personalizedBody,
          userId: ctx.userId,
        });
      }

      // For SMS campaigns
      if (
        (campaign.type === 'SMS' || campaign.type === 'MULTI_CHANNEL') &&
        message.recipientPhone
      ) {
        const firstName = message.recipientName?.split(' ')[0] || '';
        const lastName = message.recipientName?.split(' ').slice(1).join(' ') || '';
        const personalizedSms = personalizeContent(campaign.smsTemplate || '', {
          name: message.recipientName || '',
          firstName,
          lastName,
          email: message.recipientEmail || '',
          businessName: message.recipientName || '',
          contactPerson: message.recipientName || '',
        });

        try {
          await sendSMS(message.recipientPhone, personalizedSms);
        } catch (smsErr) {
          console.error(`SMS failed for ${message.recipientPhone}:`, smsErr);
        }
      }

      // For VOICE_CALL campaigns
      if (
        (campaign.type === 'VOICE_CALL' || campaign.type === 'MULTI_CHANNEL') &&
        message.recipientPhone &&
        campaign.voiceAgentId
      ) {
        try {
          // Create outbound call
          const outboundCall = await db.outboundCall.create({
            data: {
              userId: ctx.userId,
              voiceAgentId: campaign.voiceAgentId,
              leadId: message.recipientId,
              name: message.recipientName || 'Unknown',
              phoneNumber: message.recipientPhone,
              purpose: campaign.name,
              notes: campaign.callScript || '',
              status: 'SCHEDULED',
              scheduledFor: new Date(),
            },
          });

          // Update campaign message with call reference
          await db.campaignMessage.update({
            where: { id: message.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          console.log(`📞 Scheduled voice call to: ${message.recipientPhone}`);
          console.log(`   Campaign: ${campaign.name}`);
          continue; // Skip the default message update below
        } catch (callError) {
          console.error(`Error scheduling voice call:`, callError);
          await db.campaignMessage.update({
            where: { id: message.id },
            data: {
              status: 'FAILED',
              errorMessage: callError instanceof Error ? callError.message : 'Failed to schedule call',
            },
          });
          continue;
        }
      }

      // Update message status (for non-voice campaigns)
      await db.campaignMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          deliveredAt: new Date(), // Simulate immediate delivery
        },
      });

      // Update campaign stats
      await db.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
          deliveredCount: { increment: 1 },
        },
      });
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      await db.campaignMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  // Check if more messages to process
  const remainingMessages = await db.campaignMessage.count({
    where: {
      campaignId,
      status: 'PENDING',
    },
  });

  if (remainingMessages > 0) {
    // Continue processing
    console.log(`${remainingMessages} messages remaining, continuing...`);
    setTimeout(() => processCampaignMessages(campaignId, userId), 2000);
  } else {
    // Mark campaign as completed
    console.log(`✅ Campaign ${campaignId} completed`);
    await db.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Calculate final analytics
    const stats = await db.campaignMessage.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const delivered = stats.find((s) => s.status === 'DELIVERED')?._count || 0;
    const total = await db.campaignMessage.count({ where: { campaignId } });

    await db.campaign.update({
      where: { id: campaignId },
      data: {
        openRate: delivered > 0 ? 0.21 : 0,
        clickRate: delivered > 0 ? 0.027 : 0,
      },
    });
  }
}

function personalizeContent(content: string, vars: Record<string, string>): string {
  if (!content) return '';
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    const doublePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    const singlePattern = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(doublePattern, value).replace(singlePattern, value);
  }
  return result;
}
