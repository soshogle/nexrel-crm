import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCrmDb, leadService } from '@/lib/dal';
import { getDalContextFromSession, createDalContext } from '@/lib/context/industry-context';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for long-running campaigns

// Helper: Check if we've exceeded frequency caps
function checkFrequencyCaps(
  campaign: any,
  dailyLimit: number | null,
  weeklyLimit: number | null
): { canSend: boolean; reason?: string } {
  const now = new Date();
  const lastSent = campaign.lastSentDate ? new Date(campaign.lastSentDate) : null;

  // Reset counters if it's a new day
  const isNewDay = !lastSent || 
    lastSent.toDateString() !== now.toDateString();
  
  const sentToday = isNewDay ? 0 : campaign.sentToday || 0;

  // Reset weekly counter if it's a new week (Sunday = start of week)
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
  };
  
  const isNewWeek = !lastSent || 
    getWeekNumber(lastSent) !== getWeekNumber(now);
  
  const sentThisWeek = isNewWeek ? 0 : campaign.sentThisWeek || 0;

  // Check daily limit
  if (dailyLimit !== null && sentToday >= dailyLimit) {
    return {
      canSend: false,
      reason: `Daily limit of ${dailyLimit} messages reached. Sent today: ${sentToday}`,
    };
  }

  // Check weekly limit
  if (weeklyLimit !== null && sentThisWeek >= weeklyLimit) {
    return {
      canSend: false,
      reason: `Weekly limit of ${weeklyLimit} messages reached. Sent this week: ${sentThisWeek}`,
    };
  }

  return { canSend: true };
}

// POST /api/sms-campaigns/[id]/send - Send SMS campaign to filtered leads
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

    const db = getCrmDb(ctx);
    // Get campaign
    const campaign = await db.smsCampaign.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign can be sent
    if (campaign.status === 'SENT') {
      return NextResponse.json(
        { error: 'Campaign has already been sent' },
        { status: 400 }
      );
    }

    if (campaign.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Campaign is currently being sent' },
        { status: 400 }
      );
    }

    // Check frequency caps
    const freqCheck = checkFrequencyCaps(
      campaign,
      campaign.dailyLimit,
      campaign.weeklyLimit
    );

    if (!freqCheck.canSend) {
      return NextResponse.json(
        { error: freqCheck.reason },
        { status: 429 } // Too Many Requests
      );
    }

    // Get user's Twilio config
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { smsProviderConfig: true, smsProviderConfigured: true },
    });

    if (!user?.smsProviderConfigured || !user?.smsProviderConfig) {
      return NextResponse.json(
        { error: 'SMS provider not configured. Please configure Twilio in Settings.' },
        { status: 400 }
      );
    }

    // Parse Twilio config to set environment variables temporarily
    let fromNumber = campaign.fromNumber;
    try {
      const config = JSON.parse(user.smsProviderConfig);
      
      // Set Twilio credentials in environment for this request
      process.env.TWILIO_ACCOUNT_SID = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
      process.env.TWILIO_AUTH_TOKEN = config.authToken || process.env.TWILIO_AUTH_TOKEN;
      process.env.TWILIO_PHONE_NUMBER = config.phoneNumber || process.env.TWILIO_PHONE_NUMBER;
      
      fromNumber = config.phoneNumber || fromNumber;
    } catch (e) {
      console.error('Failed to parse SMS provider config:', e);
      return NextResponse.json(
        { error: 'Invalid SMS provider configuration' },
        { status: 400 }
      );
    }

    // Update campaign status to SENDING
    await db.smsCampaign.update({
      where: { id: params.id },
      data: { status: 'SENDING' },
    });

    // Get target leads based on filters
    const targetLeads = await leadService.findMany(ctx, {
      where: {
        leadScore: campaign.minLeadScore ? { gte: campaign.minLeadScore } : undefined,
        id: campaign.targetLeadIds ? { in: campaign.targetLeadIds as any } : undefined,
        phone: { not: null },
      },
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        phone: true,
        leadScore: true,
      },
    });

    if (targetLeads.length === 0) {
      await db.smsCampaign.update({
        where: { id: params.id },
        data: {
          status: 'SENT',
          completedAt: new Date(),
        },
      });
      return NextResponse.json({
        message: 'No leads match the campaign criteria',
        sent: 0,
        failed: 0,
      });
    }

    // Check how many we can send based on frequency caps
    let remainingDaily = campaign.dailyLimit
      ? campaign.dailyLimit - (campaign.sentToday || 0)
      : targetLeads.length;
    let remainingWeekly = campaign.weeklyLimit
      ? campaign.weeklyLimit - (campaign.sentThisWeek || 0)
      : targetLeads.length;

    const maxToSend = Math.min(
      targetLeads.length,
      remainingDaily,
      remainingWeekly
    );

    const leadsToSend = targetLeads.slice(0, maxToSend);

    // Send SMS to each lead
    let sentCount = 0;
    let failedCount = 0;
    let deliveredCount = 0;

    for (const lead of leadsToSend) {
      try {
        // Personalize message if needed
        let personalizedMessage = campaign.message;
        if (lead.contactPerson) {
          personalizedMessage = personalizedMessage.replace(
            /\{name\}|\{contactPerson\}/gi,
            lead.contactPerson
          );
        }
        if (lead.businessName) {
          personalizedMessage = personalizedMessage.replace(
            /\{businessName\}|\{company\}/gi,
            lead.businessName
          );
        }

        // Send SMS via Twilio
        const result = await sendSMS(lead.phone!, personalizedMessage);

        // Create campaign recipient record
        await db.smsCampaignDeal.create({
          data: {
            campaignId: params.id,
            leadId: lead.id,
            recipientPhone: lead.phone!,
            recipientName: lead.contactPerson || lead.businessName,
            status: result.status === 'queued' || result.status === 'sending' ? 'SENT' : 'PENDING',
            sentAt: new Date(),
            twilioSid: result.sid,
          },
        });

        sentCount++;
        // Assume delivered if Twilio accepted it (status tracking comes via webhooks)
        if (result.status === 'queued' || result.status === 'sent' || result.status === 'delivered') {
          deliveredCount++;
        }

        // Small delay to avoid rate limiting (50ms between messages)
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        console.error(`Failed to send SMS to lead ${lead.id}:`, error);
        failedCount++;

        // Create failed recipient record
        await db.smsCampaignDeal.create({
          data: {
            campaignId: params.id,
            leadId: lead.id,
            recipientPhone: lead.phone!,
            recipientName: lead.contactPerson || lead.businessName,
            status: 'FAILED',
            errorMessage: error.message || 'Unknown error',
          },
        });
      }
    }

    // Update campaign with results
    const now = new Date();
    const lastSent = campaign.lastSentDate ? new Date(campaign.lastSentDate) : null;
    const isNewDay = !lastSent || lastSent.toDateString() !== now.toDateString();
    
    const getWeekNumber = (date: Date) => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
      return Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
    };
    const isNewWeek = !lastSent || getWeekNumber(lastSent) !== getWeekNumber(now);

    await db.smsCampaign.update({
      where: { id: params.id },
      data: {
        status: 'SENT',
        sentAt: campaign.sentAt || now,
        completedAt: now,
        lastSentDate: now,
        sentToday: isNewDay ? sentCount : (campaign.sentToday || 0) + sentCount,
        sentThisWeek: isNewWeek ? sentCount : (campaign.sentThisWeek || 0) + sentCount,
        totalSent: campaign.totalSent + sentCount,
        totalDelivered: campaign.totalDelivered + deliveredCount,
        totalFailed: campaign.totalFailed + failedCount,
      },
    });

    return NextResponse.json({
      message: `Campaign sent successfully`,
      sent: sentCount,
      failed: failedCount,
      delivered: deliveredCount,
      skipped: targetLeads.length - leadsToSend.length,
      totalTargeted: targetLeads.length,
    });
  } catch (error: any) {
    console.error('Error sending SMS campaign:', error);
    
    // Update campaign status back to DRAFT on error
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const ctx = createDalContext(session.user.id, session.user.industry);
        const db = getCrmDb(ctx);
        await db.smsCampaign.update({
          where: { id: params.id },
          data: { status: 'DRAFT' },
        });
      }
    } catch (e) {
      console.error('Failed to update campaign status:', e);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send SMS campaign' },
      { status: 500 }
    );
  }
}
