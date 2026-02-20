import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';

/**
 * Process scheduled SMS drip messages.
 * Should be called by a cron job every 5-10 minutes.
 */
export async function processSmsDripMessages() {
  try {
    console.log('[SMS Drip] Starting processing...');

    const activeCampaigns = await prisma.smsCampaign.findMany({
      where: {
        status: 'ACTIVE',
        isSequence: true,
      },
      include: {
        sequences: { orderBy: { sequenceOrder: 'asc' } },
      },
    });

    console.log(`[SMS Drip] Found ${activeCampaigns.length} active campaigns`);

    for (const campaign of activeCampaigns) {
      await processCampaignSms(campaign);
    }

    console.log('[SMS Drip] Processing completed');
    return { success: true };
  } catch (error) {
    console.error('[SMS Drip] Error:', error);
    throw error;
  }
}

async function processCampaignSms(campaign: any) {
  try {
    console.log(`[SMS Drip] Processing campaign: ${campaign.name} (${campaign.id})`);

    const now = new Date();
    const readyEnrollments = await prisma.smsEnrollment.findMany({
      where: {
        campaignId: campaign.id,
        status: 'ACTIVE',
        nextSendAt: { lte: now },
      },
      include: {
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      take: 50,
    });

    console.log(`[SMS Drip] ${readyEnrollments.length} enrollments ready`);

    for (const enrollment of readyEnrollments) {
      await processEnrollment(enrollment, campaign);
    }
  } catch (error) {
    console.error(`[SMS Drip] Error processing campaign ${campaign.id}:`, error);
  }
}

async function processEnrollment(enrollment: any, campaign: any) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: enrollment.leadId },
    });

    if (!lead || !lead.phone) {
      console.log(`[SMS Drip] Lead ${enrollment.leadId} has no phone, skipping`);
      return;
    }

    const nextSequence = campaign.sequences.find(
      (s: any) => s.sequenceOrder === enrollment.currentStep
    );

    if (!nextSequence) {
      await prisma.smsEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await prisma.smsCampaign.update({
        where: { id: campaign.id },
        data: { totalCompleted: { increment: 1 } },
      });
      console.log(`[SMS Drip] Enrollment ${enrollment.id} completed`);
      return;
    }

    if (nextSequence.skipIfReplied && enrollment.lastRepliedAt) {
      const lastMessage = enrollment.messages[0];
      if (lastMessage?.repliedAt) {
        console.log(`[SMS Drip] Skipping for lead ${lead.id} (replied)`);
        await moveToNextSequence(enrollment, campaign, nextSequence);
        return;
      }
    }

    const personalizedMessage = personalizeContent(nextSequence.message, lead, campaign);

    const scheduledFor = new Date();
    if (nextSequence.sendTime) {
      const [hours, minutes] = nextSequence.sendTime.split(':');
      scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (scheduledFor < new Date()) {
        scheduledFor.setDate(scheduledFor.getDate() + 1);
      }
    }

    // Check rate limits
    if (campaign.dailyLimit && campaign.sentToday >= campaign.dailyLimit) {
      console.log(`[SMS Drip] Daily limit reached for campaign ${campaign.id}`);
      return;
    }

    const message = await prisma.smsSequenceMessage.create({
      data: {
        enrollmentId: enrollment.id,
        sequenceId: nextSequence.id,
        recipientPhone: lead.phone,
        recipientName: lead.contactPerson || lead.businessName || '',
        message: personalizedMessage,
        status: 'PENDING',
        scheduledFor,
      },
    });

    try {
      const result = await sendSMS(lead.phone, personalizedMessage);

      await prisma.smsSequenceMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          twilioSid: result?.sid || null,
        },
      });

      await prisma.smsSequence.update({
        where: { id: nextSequence.id },
        data: { totalSent: { increment: 1 } },
      });

      await prisma.smsCampaign.update({
        where: { id: campaign.id },
        data: {
          totalSent: { increment: 1 },
          sentToday: { increment: 1 },
          sentThisWeek: { increment: 1 },
          lastSentDate: new Date(),
        },
      });

      await moveToNextSequence(enrollment, campaign, nextSequence);
      console.log(`[SMS Drip] Sent SMS to ${lead.phone}`);
    } catch (sendError) {
      console.error(`[SMS Drip] Failed to send:`, sendError);
      await prisma.smsSequenceMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          errorMessage: String(sendError),
        },
      });
      await prisma.smsSequence.update({
        where: { id: nextSequence.id },
        data: { totalFailed: { increment: 1 } },
      });
    }

    // Rate limit: 100ms between sends
    await new Promise((r) => setTimeout(r, 100));
  } catch (error) {
    console.error(`[SMS Drip] Error processing enrollment ${enrollment.id}:`, error);
  }
}

async function moveToNextSequence(enrollment: any, campaign: any, currentSequence: any) {
  const nextStep = enrollment.currentStep + 1;
  const nextSequence = campaign.sequences.find(
    (s: any) => s.sequenceOrder === nextStep
  );

  if (nextSequence) {
    const nextSendAt = new Date();
    nextSendAt.setDate(nextSendAt.getDate() + nextSequence.delayDays);
    nextSendAt.setHours(nextSendAt.getHours() + nextSequence.delayHours);

    await prisma.smsEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentSequenceId: nextSequence.id,
        currentStep: nextStep,
        nextSendAt,
      },
    });
  } else {
    await prisma.smsEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await prisma.smsCampaign.update({
      where: { id: campaign.id },
      data: { totalCompleted: { increment: 1 } },
    });
  }
}

function personalizeContent(content: string, lead: any, campaign: any): string {
  if (!content) return '';
  let personalized = content;

  const firstName = lead.contactPerson?.split(' ')[0] || '';
  const lastName = lead.contactPerson?.split(' ').slice(1).join(' ') || '';

  const vars: Record<string, string> = {
    firstName,
    lastName,
    first_name: firstName,
    last_name: lastName,
    name: lead.contactPerson || lead.businessName || '',
    businessName: lead.businessName || '',
    business_name: lead.businessName || '',
    contactPerson: lead.contactPerson || '',
    contact_person: lead.contactPerson || '',
    company: lead.businessName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    city: lead.city || '',
    state: lead.state || '',
    notes: lead.notes || '',
    campaignName: campaign.name || '',
  };

  for (const [key, value] of Object.entries(vars)) {
    const doublePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    const singlePattern = new RegExp(`\\{${key}\\}`, 'gi');
    personalized = personalized.replace(doublePattern, value).replace(singlePattern, value);
  }

  return personalized;
}
