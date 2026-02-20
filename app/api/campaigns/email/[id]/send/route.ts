import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email-service';
import { emitCRMEvent } from '@/lib/crm-event-emitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        recipients: {
          where: { status: 'PENDING' },
          include: {
            lead: { select: { contactPerson: true, businessName: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    await prisma.emailCampaign.update({
      where: { id: params.id },
      data: { status: 'SENDING', sentAt: new Date() },
    });

    const emailService = new EmailService();
    let sentCount = 0;
    let failCount = 0;

    for (const recipient of campaign.recipients) {
      const email = recipient.recipientEmail || recipient.lead?.email;
      if (!email) {
        await prisma.emailCampaignDeal.update({
          where: { id: recipient.id },
          data: { status: 'FAILED' },
        });
        failCount++;
        continue;
      }

      const name = recipient.recipientName || recipient.lead?.contactPerson || recipient.lead?.businessName || '';
      const firstName = name.split(' ')[0] || '';
      const lastName = name.split(' ').slice(1).join(' ') || '';

      const vars = { name, firstName, lastName, email, businessName: name, contactPerson: name };

      const personalizedSubject = personalizeContent(campaign.subject || '', vars);
      const personalizedHtml = personalizeContent(campaign.htmlContent || '', vars);
      const personalizedText = personalizeContent(campaign.textContent || '', vars);

      try {
        const sent = await emailService.sendEmail({
          to: email,
          subject: personalizedSubject,
          html: personalizedHtml || `<p>${personalizedText}</p>`,
          text: personalizedText,
          userId: session.user.id,
        });

        await prisma.emailCampaignDeal.update({
          where: { id: recipient.id },
          data: {
            status: sent ? 'SENT' : 'FAILED',
            sentAt: sent ? new Date() : undefined,
          },
        });

        if (sent) sentCount++;
        else failCount++;
      } catch (err) {
        console.error(`[Email Campaign] Failed to send to ${email}:`, err);
        await prisma.emailCampaignDeal.update({
          where: { id: recipient.id },
          data: { status: 'FAILED' },
        });
        failCount++;
      }

      // Rate limit: 50ms between sends
      await new Promise((r) => setTimeout(r, 50));
    }

    await prisma.emailCampaign.update({
      where: { id: params.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    emitCRMEvent('campaign_sent', session.user.id, { entityId: params.id, entityType: 'EmailCampaign', data: { sentCount, failCount } });

    return NextResponse.json({
      success: true,
      sentCount,
      failCount,
      message: `Campaign sent: ${sentCount} delivered, ${failCount} failed`,
    });
  } catch (error: unknown) {
    console.error('Error sending email campaign:', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
