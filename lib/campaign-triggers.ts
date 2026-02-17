import { prisma } from '@/lib/db';

interface TriggerContext {
  leadId: string;
  userId: string;
  triggerType:
    | 'LEAD_CREATED'
    | 'LEAD_STATUS'
    | 'TAG_ADDED'
    | 'FORM_SUBMITTED'
    | 'DEAL_CREATED'
    | 'DEAL_WON'
    | 'REFERRAL_CREATED'
    | 'REFERRAL_CONVERTED'
    | 'SERVICE_COMPLETED'
    | 'FEEDBACK_POSITIVE'
    | 'WEBSITE_VOICE_AI_LEAD'
    | 'WEBSITE_SECRET_REPORT_LEAD'
    | 'TRIAL_ENDED'
    | 'WORKFLOW_TASK_COMPLETED';
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    tagName?: string;
    formId?: string;
    dealId?: string;
    websiteId?: string;
    workflowId?: string;
    taskId?: string;
  };
}

/**
 * Process campaign triggers and auto-enroll leads in matching campaigns
 */
export async function processCampaignTriggers(context: TriggerContext) {
  try {
    const { leadId, userId, triggerType, metadata } = context;

    // Find all active campaigns with matching trigger types
    const emailCampaigns = await prisma.emailDripCampaign.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        triggerType: triggerType as any,
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' as any },
          take: 1,
        },
      },
    });

    const smsCampaigns = await prisma.smsCampaign.findMany({
      where: {
        userId,
        status: 'ACTIVE' as any,
        isSequence: true,
        triggerType: triggerType,
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' as any },
          take: 1,
        },
      },
    });

    // Enroll in email campaigns
    for (const campaign of emailCampaigns) {
      // Check if trigger conditions match
      if (!shouldEnrollInCampaign(campaign.triggerConfig, triggerType, metadata)) {
        continue;
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.emailDripEnrollment.findUnique({
        where: {
          campaignId_leadId: {
            campaignId: campaign.id,
            leadId,
          },
        },
      });

      if (existingEnrollment) {
        continue; // Skip if already enrolled
      }

      // Get first sequence
      const firstSequence = campaign.sequences[0];
      if (!firstSequence) {
        continue;
      }

      // Calculate next send time
      const nextSendAt = new Date();
      if (firstSequence.delayDays > 0) {
        nextSendAt.setDate(nextSendAt.getDate() + firstSequence.delayDays);
      }
      if (firstSequence.delayHours > 0) {
        nextSendAt.setHours(nextSendAt.getHours() + firstSequence.delayHours);
      }

      // Determine A/B test group if enabled
      let abTestGroup = null;
      if (campaign.enableAbTesting && campaign.abTestConfig) {
        const config = campaign.abTestConfig as any;
        const random = Math.random() * 100;
        abTestGroup = random < (config.splitPercentage || 50) ? 'A' : 'B';
      }

      // Enroll lead
      await prisma.emailDripEnrollment.create({
        data: {
          campaignId: campaign.id,
          leadId,
          status: 'ACTIVE',
          currentSequenceId: firstSequence.id,
          currentStep: 1,
          nextSendAt,
          abTestGroup,
        },
      });

      // Update campaign stats
      await prisma.emailDripCampaign.update({
        where: { id: campaign.id },
        data: {
          totalEnrolled: { increment: 1 },
        },
      });

      console.log(
        `Auto-enrolled lead ${leadId} in email campaign ${campaign.id} via ${triggerType}`
      );
    }

    // Enroll in SMS campaigns
    for (const campaign of smsCampaigns) {
      // Check if trigger conditions match
      // SMS campaigns don't have triggerConfig, so we skip this check
      // if (!shouldEnrollInCampaign(campaign.triggerConfig, triggerType, metadata)) {
      //   continue;
      // }

      // Check if already enrolled
      const existingEnrollment = await prisma.smsEnrollment.findUnique({
        where: {
          campaignId_leadId: {
            campaignId: campaign.id,
            leadId,
          },
        },
      });

      if (existingEnrollment) {
        continue;
      }

      // Get first sequence
      const firstSequence = campaign.sequences[0];
      if (!firstSequence) {
        continue;
      }

      // Calculate next send time
      const nextSendAt = new Date();
      if (firstSequence.delayDays > 0) {
        nextSendAt.setDate(nextSendAt.getDate() + firstSequence.delayDays);
      }
      if (firstSequence.delayHours > 0) {
        nextSendAt.setHours(nextSendAt.getHours() + firstSequence.delayHours);
      }

      // Enroll lead
      await prisma.smsEnrollment.create({
        data: {
          campaignId: campaign.id,
          leadId,
          status: 'ACTIVE',
          currentSequenceId: firstSequence.id,
          currentStep: 1,
          nextSendAt,
        },
      });

      // Update campaign stats
      await prisma.smsCampaign.update({
        where: { id: campaign.id },
        data: {
          totalEnrolled: { increment: 1 },
        },
      });

      console.log(
        `Auto-enrolled lead ${leadId} in SMS campaign ${campaign.id} via ${triggerType}`
      );
    }

    return {
      emailCampaignsEnrolled: emailCampaigns.length,
      smsCampaignsEnrolled: smsCampaigns.length,
    };
  } catch (error) {
    console.error('Error processing campaign triggers:', error);
    throw error;
  }
}

/**
 * Check if a lead should be enrolled based on trigger configuration
 */
function shouldEnrollInCampaign(
  triggerConfig: any,
  triggerType: string,
  metadata?: TriggerContext['metadata']
): boolean {
  if (!triggerConfig) {
    return true; // No specific config, enroll by default
  }

  // For LEAD_STATUS trigger, check if status matches
  if (triggerType === 'LEAD_STATUS' && triggerConfig.targetStatus) {
    return metadata?.newStatus === triggerConfig.targetStatus;
  }

  // For TAG_ADDED trigger, check if tag matches
  if (triggerType === 'TAG_ADDED' && triggerConfig.targetTag) {
    return metadata?.tagName === triggerConfig.targetTag;
  }

  // For FORM_SUBMITTED trigger, check if form matches
  if (triggerType === 'FORM_SUBMITTED' && triggerConfig.targetFormId) {
    return metadata?.formId === triggerConfig.targetFormId;
  }

  // For DEAL_WON trigger, check if deal stage matches
  if (triggerType === 'DEAL_WON' && triggerConfig.targetDealStage) {
    return metadata?.newStatus === triggerConfig.targetDealStage;
  }

  // For WORKFLOW_TASK_COMPLETED trigger, check if workflow/task matches
  if (triggerType === 'WORKFLOW_TASK_COMPLETED') {
    if (triggerConfig.targetWorkflowId && metadata?.workflowId !== triggerConfig.targetWorkflowId) {
      return false;
    }
    if (triggerConfig.targetTaskId && metadata?.taskId !== triggerConfig.targetTaskId) {
      return false;
    }
  }

  return true; // Default to enrolling if no specific conditions
}

/**
 * Manually trigger campaign enrollment for a lead
 */
export async function triggerCampaignEnrollment(
  campaignId: string,
  leadIds: string[],
  campaignType: 'email' | 'sms' = 'email'
) {
  try {
    let enrolled = 0;
    let skipped = 0;

    for (const leadId of leadIds) {
      if (campaignType === 'email') {
        const campaign = await prisma.emailDripCampaign.findUnique({
          where: { id: campaignId },
          include: {
            sequences: {
              orderBy: { sequenceOrder: 'asc' },
              take: 1,
            },
          },
        });

        if (!campaign || !campaign.sequences[0]) {
          continue;
        }

        // Check if already enrolled
        const existing = await prisma.emailDripEnrollment.findUnique({
          where: {
            campaignId_leadId: {
              campaignId,
              leadId,
            },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const firstSequence = campaign.sequences[0];
        const nextSendAt = new Date();
        if (firstSequence.delayDays > 0) {
          nextSendAt.setDate(nextSendAt.getDate() + firstSequence.delayDays);
        }
        if (firstSequence.delayHours > 0) {
          nextSendAt.setHours(nextSendAt.getHours() + firstSequence.delayHours);
        }

        // Determine A/B test group
        let abTestGroup = null;
        if (campaign.enableAbTesting && campaign.abTestConfig) {
          const config = campaign.abTestConfig as any;
          const random = Math.random() * 100;
          abTestGroup = random < (config.splitPercentage || 50) ? 'A' : 'B';
        }

        await prisma.emailDripEnrollment.create({
          data: {
            campaignId,
            leadId,
            status: 'ACTIVE',
            currentSequenceId: firstSequence.id,
            currentStep: 1,
            nextSendAt,
            abTestGroup,
          },
        });

        enrolled++;
      } else {
        // SMS enrollment logic
        const campaign = await prisma.smsCampaign.findUnique({
          where: { id: campaignId },
          include: {
            sequences: {
              orderBy: { sequenceOrder: 'asc' },
              take: 1,
            },
          },
        });

        if (!campaign || !campaign.sequences[0]) {
          continue;
        }

        const existing = await prisma.smsEnrollment.findUnique({
          where: {
            campaignId_leadId: {
              campaignId,
              leadId,
            },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const firstSequence = campaign.sequences[0];
        const nextSendAt = new Date();
        if (firstSequence.delayDays > 0) {
          nextSendAt.setDate(nextSendAt.getDate() + firstSequence.delayDays);
        }
        if (firstSequence.delayHours > 0) {
          nextSendAt.setHours(nextSendAt.getHours() + firstSequence.delayHours);
        }

        await prisma.smsEnrollment.create({
          data: {
            campaignId,
            leadId,
            status: 'ACTIVE',
            currentSequenceId: firstSequence.id,
            currentStep: 1,
            nextSendAt,
          },
        });

        enrolled++;
      }
    }

    return { enrolled, skipped };
  } catch (error) {
    console.error('Error triggering campaign enrollment:', error);
    throw error;
  }
}
