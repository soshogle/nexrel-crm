import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService } from '@/lib/dal';
import { sendDripEmail } from '@/lib/email-sender';

/**
 * Process scheduled drip emails
 * This should be called by a cron job every 5-10 minutes
 */
export async function processDripEmails() {
  try {
    console.log('[Drip Processor] Starting email processing...');

    const db = getCrmDb(createDalContext('bootstrap'));
    // Find active campaigns
    const activeCampaigns = await db.emailDripCampaign.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    console.log(`[Drip Processor] Found ${activeCampaigns.length} active campaigns`);

    for (const campaign of activeCampaigns) {
      await processCampaignEmails(campaign);
    }

    console.log('[Drip Processor] Email processing completed');
    return { success: true };
  } catch (error) {
    console.error('[Drip Processor] Error processing drip emails:', error);
    throw error;
  }
}

/**
 * Process emails for a specific campaign
 */
async function processCampaignEmails(campaign: any) {
  try {
    console.log(`[Drip Processor] Processing campaign: ${campaign.name} (${campaign.id})`);

    // Find enrollments ready for next email
    const now = new Date();
    const db = getCrmDb(createDalContext(campaign.userId));
    const readyEnrollments = await db.emailDripEnrollment.findMany({
      where: {
        campaignId: campaign.id,
        status: 'ACTIVE',
        nextSendAt: {
          lte: now,
        },
      },
      include: {
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      take: 50, // Process in batches
    });

    console.log(`[Drip Processor] Found ${readyEnrollments.length} enrollments ready for next email`);

    for (const enrollment of readyEnrollments) {
      await processEnrollment(enrollment, campaign);
    }
  } catch (error) {
    console.error(`[Drip Processor] Error processing campaign ${campaign.id}:`, error);
  }
}

/**
 * Process a single enrollment
 */
async function processEnrollment(enrollment: any, campaign: any) {
  try {
    const ctx = createDalContext(campaign.userId);
    const lead = await leadService.findUnique(ctx, enrollment.leadId);

    if (!lead || !lead.email) {
      console.log(`[Drip Processor] Lead ${enrollment.leadId} has no email, skipping`);
      return;
    }

    // Find next sequence to send
    const sequences = campaign.sequences.filter((s: any) => {
      // Filter by A/B test group if applicable
      if (campaign.enableAbTesting && s.isAbTestVariant) {
        return s.abTestGroup === enrollment.abTestGroup;
      }
      return !s.isAbTestVariant;
    });

    const nextSequence = sequences.find(
      (s: any) => s.sequenceOrder === enrollment.currentStep
    );

    if (!nextSequence) {
      // No more sequences, mark as completed
      await db.emailDripEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await db.emailDripCampaign.update({
        where: { id: campaign.id },
        data: {
          totalCompleted: { increment: 1 },
        },
      });

      console.log(`[Drip Processor] Enrollment ${enrollment.id} completed`);
      return;
    }

    // Check skip conditions
    if (nextSequence.skipIfEngaged && enrollment.lastEngagedAt) {
      // Check if lead engaged with previous email
      const lastMessage = enrollment.messages[0];
      if (lastMessage && (lastMessage.openedAt || lastMessage.clickedAt)) {
        console.log(`[Drip Processor] Skipping sequence for engaged lead ${lead.id}`);
        await moveToNextSequence(enrollment, campaign, nextSequence);
        return;
      }
    }

    // Personalize content
    const personalizedContent = personalizeContent(
      nextSequence.htmlContent,
      lead,
      campaign
    );
    const personalizedSubject = personalizeContent(
      nextSequence.subject,
      lead,
      campaign
    );

    // Create tracking ID
    const trackingId = `${enrollment.id}_${nextSequence.id}_${Date.now()}`;

    // Schedule message
    const scheduledFor = new Date();
    if (nextSequence.sendTime) {
      const [hours, minutes] = nextSequence.sendTime.split(':');
      scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (scheduledFor < new Date()) {
        scheduledFor.setDate(scheduledFor.getDate() + 1);
      }
    }

    // Create message record
    const message = await db.emailDripMessage.create({
      data: {
        enrollmentId: enrollment.id,
        sequenceId: nextSequence.id,
        recipientEmail: lead.email,
        recipientName: lead.businessName || lead.contactPerson || '',
        subject: personalizedSubject,
        htmlContent: personalizedContent,
        textContent: nextSequence.textContent,
        status: 'PENDING',
        scheduledFor,
        trackingId,
      },
    });

    // Send email
    try {
      const sent = await sendDripEmail({
        to: lead.email,
        subject: personalizedSubject,
        html: injectTrackingPixel(personalizedContent, trackingId),
        text: nextSequence.textContent,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        trackingId,
      });

      if (sent) {
        // Update message status
        await db.emailDripMessage.update({
          where: { id: message.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        // Update sequence stats
        await db.emailDripSequence.update({
          where: { id: nextSequence.id },
          data: {
            totalSent: { increment: 1 },
          },
        });

        // Move to next sequence
        await moveToNextSequence(enrollment, campaign, nextSequence);

        console.log(`[Drip Processor] Sent email to ${lead.email}`);
      } else {
        // Mark as failed
        await db.emailDripMessage.update({
          where: { id: message.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Failed to send email',
          },
        });
      }
    } catch (sendError) {
      console.error(`[Drip Processor] Error sending email:`, sendError);
      await prisma.emailDripMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          errorMessage: String(sendError),
        },
      });
    }
  } catch (error) {
    console.error(`[Drip Processor] Error processing enrollment ${enrollment.id}:`, error);
  }
}

/**
 * Move enrollment to next sequence
 */
async function moveToNextSequence(
  enrollment: any,
  campaign: any,
  currentSequence: any
) {
  const sequences = campaign.sequences.filter((s: any) => {
    if (campaign.enableAbTesting && s.isAbTestVariant) {
      return s.abTestGroup === enrollment.abTestGroup;
    }
    return !s.isAbTestVariant;
  });

  const nextStep = enrollment.currentStep + 1;
  const nextSequence = sequences.find(
    (s: any) => s.sequenceOrder === nextStep
  );

  if (nextSequence) {
    // Calculate next send time
    const nextSendAt = new Date();
    nextSendAt.setDate(nextSendAt.getDate() + nextSequence.delayDays);
    nextSendAt.setHours(nextSendAt.getHours() + nextSequence.delayHours);

    await prisma.emailDripEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentSequenceId: nextSequence.id,
        currentStep: nextStep,
        nextSendAt,
      },
    });
  } else {
    // No more sequences
    await prisma.emailDripEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await prisma.emailDripCampaign.update({
      where: { id: campaign.id },
      data: {
        totalCompleted: { increment: 1 },
      },
    });
  }
}

/**
 * Personalize email content with merge tags
 */
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
    campaign_name: campaign.name || '',
    campaignName: campaign.name || '',
  };

  for (const [key, value] of Object.entries(vars)) {
    const doublePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    const singlePattern = new RegExp(`\\{${key}\\}`, 'gi');
    personalized = personalized.replace(doublePattern, value).replace(singlePattern, value);
  }

  return personalized;
}

/**
 * Inject tracking pixel into HTML content
 */
function injectTrackingPixel(html: string, trackingId: string): string {
  const trackingPixel = `<img src="${process.env.NEXTAUTH_URL}/api/campaigns/drip/track/${trackingId}/open" width="1" height="1" alt="" />`;
  
  // Try to inject before closing body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`);
  }
  
  // Otherwise append to end
  return html + trackingPixel;
}

/**
 * Replace links with tracking links
 */
function replaceLinksWithTracking(html: string, trackingId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL;
  const regex = /<a([^>]*)href=["']([^"']+)["']([^>]*)>/gi;
  
  return html.replace(regex, (match, before, url, after) => {
    const trackingUrl = `${baseUrl}/api/campaigns/drip/track/${trackingId}/click?url=${encodeURIComponent(url)}`;
    return `<a${before}href="${trackingUrl}"${after}>`;
  });
}
