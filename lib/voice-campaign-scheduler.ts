/**
 * Voice Campaign Scheduler Service
 * Handles automated voice calling campaigns with intelligent scheduling
 */

import { prisma } from '@/lib/db';
import { parse, format, isAfter, isBefore, addMinutes, startOfDay } from 'date-fns';

export class VoiceCampaignScheduler {
  /**
   * Process running voice campaigns and schedule calls
   */
  async processRunningCampaigns(userId?: string) {
    try {
      const where: any = {
        type: 'VOICE_CALL',
        status: 'RUNNING',
      };

      if (userId) {
        where.userId = userId;
      }

      const campaigns = await prisma.campaign.findMany({
        where,
        include: {
          voiceAgent: true,
          campaignLeads: {
            where: {
              status: { in: ['PENDING', 'FAILED'] },
            },
            include: {
              lead: true,
            },
          },
        },
      });

      console.log(`\n🎯 Processing ${campaigns.length} running voice campaigns...`);

      for (const campaign of campaigns) {
        await this.processCampaign(campaign);
      }

      return { success: true, processed: campaigns.length };
    } catch (error: any) {
      console.error('❌ Error processing voice campaigns:', error);
      throw error;
    }
  }

  /**
   * Process individual campaign
   */
  private async processCampaign(campaign: any) {
    console.log(`\n📞 Processing campaign: ${campaign.name}`);

    // Check if we're within calling window
    if (!this.isWithinCallingWindow(campaign)) {
      console.log('⏰ Outside calling window, skipping...');
      return;
    }

    // Check daily call limit
    const callsToday = await this.getCallsToday(campaign.id);
    const maxCalls = campaign.maxCallsPerDay || 50;
    const remainingCalls = maxCalls - callsToday;

    if (remainingCalls <= 0) {
      console.log(`🚫 Daily limit reached (${callsToday}/${maxCalls})`);
      return;
    }

    console.log(`✅ Can make ${remainingCalls} more calls today`);

    // Get leads to call
    const leadsToCall = this.selectLeadsToCall(campaign, remainingCalls);

    console.log(`📋 Selected ${leadsToCall.length} leads to call`);

    // Schedule calls
    for (const campaignLead of leadsToCall) {
      try {
        await this.initiateCall(campaign, campaignLead);
      } catch (error: any) {
        console.error(`❌ Error calling lead ${campaignLead.leadId}:`, error.message);
      }
    }
  }

  /**
   * Check if current time is within campaign's calling window
   */
  private isWithinCallingWindow(campaign: any): boolean {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    const windowStart = campaign.callWindowStart || '09:00';
    const windowEnd = campaign.callWindowEnd || '17:00';

    return currentTime >= windowStart && currentTime <= windowEnd;
  }

  /**
   * Get number of calls made today for campaign
   */
  private async getCallsToday(campaignId: string): Promise<number> {
    const today = startOfDay(new Date());

    const count = await prisma.campaignMessage.count({
      where: {
        campaignId,
        sentAt: {
          gte: today,
        },
      },
    });

    return count;
  }

  /**
   * Select leads to call based on campaign rules
   */
  private selectLeadsToCall(campaign: any, limit: number): any[] {
    let eligibleLeads = campaign.campaignLeads.filter((cl: any) => {
      // Must be pending or failed (with retries available)
      if (cl.status === 'PENDING') return true;
      if (cl.status === 'FAILED' && campaign.retryFailedCalls) {
        const attempts = cl.attempts || 0;
        return attempts < (campaign.maxRetries || 2);
      }
      return false;
    });

    // Filter by lead score if specified
    if (campaign.minLeadScore) {
      eligibleLeads = eligibleLeads.filter((cl: any) => {
        return (cl.lead?.score || 0) >= campaign.minLeadScore;
      });
    }

    // Sort by priority (higher score first)
    eligibleLeads.sort((a: any, b: any) => {
      const scoreA = a.lead?.score || 0;
      const scoreB = b.lead?.score || 0;
      return scoreB - scoreA;
    });

    // Return limited number
    return eligibleLeads.slice(0, limit);
  }

  /**
   * Initiate a voice call for a campaign lead
   */
  private async initiateCall(campaign: any, campaignLead: any) {
    const lead = campaignLead.lead;

    if (!lead || !lead.phone) {
      console.log(`⚠️  Lead ${campaignLead.leadId} has no phone number`);
      return;
    }

    console.log(`☎️  Calling ${lead.contactPerson || lead.businessName} at ${lead.phone}`);

    try {
      // Create campaign message record
      const message = await prisma.campaignMessage.create({
        data: {
          campaignId: campaign.id,
          recipientType: 'LEAD',
          recipientId: lead.id,
          recipientName: lead.contactPerson || lead.businessName || 'Unknown',
          recipientPhone: lead.phone,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      // Initiate outbound call via API
      const callResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/outbound-calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceAgentId: campaign.voiceAgentId,
          name: lead.contactPerson || lead.businessName || 'Unknown',
          phoneNumber: lead.phone,
          leadId: lead.id,
          purpose: `Campaign: ${campaign.name}`,
          notes: campaign.callScript || campaign.description,
          immediate: true,
          campaignId: campaign.id,
          campaignMessageId: message.id,
        }),
      });

      if (!callResponse.ok) {
        throw new Error(`Call API returned ${callResponse.status}`);
      }

      const callData = await callResponse.json();
      console.log(`✅ Call initiated successfully:`, callData.outboundCall?.id);

      // Update campaign lead
      await prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: {
          status: 'SENT',
          attempts: (campaignLead.attempts || 0) + 1,
        },
      });

      // Update campaign stats
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          sentCount: { increment: 1 },
          totalCalls: { increment: 1 },
        },
      });
    } catch (error: any) {
      console.error(`❌ Failed to initiate call:`, error.message);

      // Update campaign message
      await prisma.campaignMessage.updateMany({
        where: {
          campaignId: campaign.id,
          recipientId: lead.id,
          status: 'SENT',
        },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      // Update campaign lead
      await prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: {
          status: 'FAILED',
          attempts: (campaignLead.attempts || 0) + 1,
        },
      });
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        campaignLeads: {
          include: {
            lead: true,
          },
        },
        messages: {
          include: {
            callLog: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Calculate analytics
    const totalLeads = campaign.campaignLeads.length;
    const totalCalls = campaign.messages.length;
    const completedCalls = campaign.messages.filter((m) => m.callStatus === 'completed').length;
    const answeredCalls = campaign.messages.filter(
      (m) => m.callLog && m.callLog.status === 'COMPLETED'
    ).length;
    const voicemails = campaign.messages.filter((m) => m.callStatus === 'no-answer').length;

    // Calculate average call duration
    const callDurations = campaign.messages
      .filter((m) => m.callLog?.duration)
      .map((m) => m.callLog!.duration)
      .filter((d): d is number => d !== null);
    const avgDuration =
      callDurations.length > 0
        ? Math.round(callDurations.reduce((a, b) => a + b, 0) / callDurations.length)
        : 0;

    // Calculate conversion rate
    const convertedLeads = campaign.campaignLeads.filter(
      (cl) => cl.status === 'COMPLETED' || cl.status === 'CONVERTED'
    ).length;

    return {
      totalLeads,
      totalCalls,
      completedCalls,
      answeredCalls,
      voicemails,
      avgDuration,
      convertedLeads,
      answerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    };
  }
}

export const voiceCampaignScheduler = new VoiceCampaignScheduler();
