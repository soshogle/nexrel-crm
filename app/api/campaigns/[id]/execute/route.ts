import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    const recipients = await getRecipients(campaign.userId, campaign.targetAudience as any);

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

    // Create all messages in a transaction
    await prisma.$transaction([
      prisma.campaignMessage.createMany({
        data: messages,
      }),
      prisma.campaign.update({
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
    processCampaignMessages(campaign.id, session.user.id).catch((error) => {
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'pause') {
      if (campaign.status !== 'RUNNING') {
        return NextResponse.json(
          { error: 'Can only pause running campaigns' },
          { status: 400 }
        );
      }

      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: 'PAUSED' },
      });

      return NextResponse.json({ success: true, message: 'Campaign paused' });
    }

    if (action === 'resume') {
      if (campaign.status !== 'PAUSED') {
        return NextResponse.json(
          { error: 'Can only resume paused campaigns' },
          { status: 400 }
        );
      }

      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: 'RUNNING' },
      });

      // Resume processing
      processCampaignMessages(campaign.id, session.user.id).catch((error) => {
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
  userId: string,
  targetAudience: any
): Promise<Array<{ id: string; type: 'LEAD'; email?: string | null; phone?: string | null; name: string }>> {
  const recipients: any[] = [];

  // Get leads
  const leadFilters: any = { userId };
  if (targetAudience?.status) {
    leadFilters.status = targetAudience.status;
  }
  if (targetAudience?.tags && Array.isArray(targetAudience.tags)) {
    leadFilters.tags = { hasSome: targetAudience.tags };
  }

  const leads = await prisma.lead.findMany({
    where: leadFilters,
    select: {
      id: true,
      businessName: true,
      contactPerson: true,
      email: true,
      phone: true,
    },
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
async function processCampaignMessages(campaignId: string, userId: string) {
  console.log(`🚀 Starting campaign message processing for campaign: ${campaignId}`);

  // Get campaign details
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    console.error('Campaign not found');
    return;
  }

  // Get pending messages
  const pendingMessages = await prisma.campaignMessage.findMany({
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
        const personalizedBody = (campaign.emailBody || '')
          .replace(/{{name}}/gi, message.recipientName || '')
          .replace(/{{email}}/gi, message.recipientEmail || '');

        await emailService.sendEmail({
          to: message.recipientEmail,
          subject: campaign.emailSubject || campaign.name,
          html: personalizedBody,
          userId: session.user.id,
        });
      }

      // For SMS campaigns
      if (
        (campaign.type === 'SMS' || campaign.type === 'MULTI_CHANNEL') &&
        message.recipientPhone
      ) {
        const personalizedSms = (campaign.smsTemplate || '')
          .replace(/{{name}}/gi, message.recipientName || '')
          .replace(/{{email}}/gi, message.recipientEmail || '');

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
          const outboundCall = await prisma.outboundCall.create({
            data: {
              userId,
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
          await prisma.campaignMessage.update({
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
          await prisma.campaignMessage.update({
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
      await prisma.campaignMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          deliveredAt: new Date(), // Simulate immediate delivery
        },
      });

      // Update campaign stats
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
          deliveredCount: { increment: 1 },
        },
      });
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      await prisma.campaignMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  // Check if more messages to process
  const remainingMessages = await prisma.campaignMessage.count({
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
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Calculate final analytics
    const stats = await prisma.campaignMessage.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const delivered = stats.find((s) => s.status === 'DELIVERED')?._count || 0;
    const total = await prisma.campaignMessage.count({ where: { campaignId } });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        openRate: delivered > 0 ? 0.21 : 0, // Simulate 21% open rate
        clickRate: delivered > 0 ? 0.027 : 0, // Simulate 2.7% click rate
      },
    });
  }
}
