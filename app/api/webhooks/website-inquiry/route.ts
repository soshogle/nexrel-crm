/**
 * POST /api/webhooks/website-inquiry
 * Receives contact-form inquiries from broker website templates.
 * Creates a Lead in the CRM with source tracking, adds the message as a Note,
 * sends an email notification to the broker, and triggers workflows.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { processWebsiteTriggers } from '@/lib/website-triggers';
import { processCampaignTriggers } from '@/lib/campaign-triggers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-website-secret');
    const body = await request.json();
    const { websiteId, name, email, phone, message, propertyId, propertyAddress } = body;

    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId required' }, { status: 400 });
    }
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { userId: true, name: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadOwnerId = website.userId;

    const existingLead = await prisma.lead.findFirst({
      where: { userId: leadOwnerId, email },
    });

    let lead;
    if (existingLead) {
      lead = existingLead;
    } else {
      lead = await prisma.lead.create({
        data: {
          userId: leadOwnerId,
          businessName: name,
          contactPerson: name,
          email,
          phone: phone || null,
          source: 'Website Contact Form',
          status: 'NEW',
          enrichedData: {
            source: 'website_contact_form',
            websiteId,
            websiteName: website.name,
            propertyId: propertyId || null,
            propertyAddress: propertyAddress || null,
            receivedAt: new Date().toISOString(),
          },
        },
      });
    }

    const noteContent = [
      `[Website Inquiry${propertyAddress ? ` — ${propertyAddress}` : ''}]`,
      '',
      `From: ${name} (${email}${phone ? `, ${phone}` : ''})`,
      '',
      message,
    ].join('\n');

    await prisma.note.create({
      data: {
        leadId: lead.id,
        userId: leadOwnerId,
        content: noteContent,
      },
    });

    // Notify the broker via email
    const broker = await prisma.user.findUnique({
      where: { id: leadOwnerId },
      select: { email: true, name: true },
    });

    if (broker?.email) {
      await emailService.sendEmail({
        to: broker.email,
        subject: `New Website Inquiry from ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:24px 30px;border-radius:8px 8px 0 0;">
              <h2 style="margin:0;">New Inquiry from ${website.name || 'Your Website'}</h2>
            </div>
            <div style="padding:24px 30px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;font-weight:600;color:#555;width:120px;">Name</td><td style="padding:8px 0;">${name}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;color:#555;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                ${phone ? `<tr><td style="padding:8px 0;font-weight:600;color:#555;">Phone</td><td style="padding:8px 0;"><a href="tel:${phone}">${phone}</a></td></tr>` : ''}
                ${propertyAddress ? `<tr><td style="padding:8px 0;font-weight:600;color:#555;">Property</td><td style="padding:8px 0;">${propertyAddress}</td></tr>` : ''}
              </table>
              <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:6px;">
                <p style="margin:0;white-space:pre-wrap;">${message}</p>
              </div>
              <p style="margin-top:20px;"><a href="${process.env.NEXTAUTH_URL || ''}/dashboard/leads/${lead.id}" style="background:#667eea;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Lead in CRM</a></p>
            </div>
          </div>
        `,
        userId: leadOwnerId,
      });
    }

    // Trigger workflows
    try {
      await processWebsiteTriggers(leadOwnerId, lead.id, 'WEBSITE_CONTACT_FORM_LEAD', { websiteId });
    } catch (wfErr) {
      console.warn('[website-inquiry] processWebsiteTriggers error:', wfErr);
    }

    try {
      await processCampaignTriggers({
        leadId: lead.id,
        userId: leadOwnerId,
        triggerType: 'WEBSITE_CONTACT_FORM_LEAD',
        metadata: { websiteId, propertyId },
      });
    } catch (campErr) {
      console.warn('[website-inquiry] processCampaignTriggers error:', campErr);
    }

    console.log(`[website-inquiry] Lead ${existingLead ? 'updated' : 'created'}: ${lead.id} (${name} ${email})`);

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[website-inquiry] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}
