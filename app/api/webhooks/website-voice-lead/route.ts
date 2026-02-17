/**
 * POST /api/webhooks/website-voice-lead
 * Receives leads from owner website Voice AI (ElevenLabs) conversations.
 * Creates lead in CRM, adds transcript as note, triggers workflows.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { detectLeadWorkflowTriggers } from '@/lib/real-estate/workflow-triggers';
import { processWebsiteTriggers } from '@/lib/website-triggers';
import { processCampaignTriggers } from '@/lib/campaign-triggers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-website-voice-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_LEAD_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, name, email, phone, transcript, notes, appointmentRequest, source } = body;

    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId required' }, { status: 400 });
    }

    if (!name && !email && !phone) {
      return NextResponse.json(
        { error: 'At least name, email, or phone required' },
        { status: 400 }
      );
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { userId: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const leadOwnerId = website.userId;

    const leadSource = source || 'Website Voice AI';
    const lead = await prisma.lead.create({
      data: {
        userId: leadOwnerId,
        businessName: name || (leadSource.includes('Report') ? 'Secret Properties Visitor' : 'Voice AI Visitor'),
        contactPerson: name || null,
        email: email || null,
        phone: phone || null,
        source: leadSource,
        status: 'NEW',
        enrichedData: {
          source: leadSource.includes('Report') ? 'website_secret_report' : 'website_voice_ai',
          websiteId,
          receivedAt: new Date().toISOString(),
          appointmentRequest: appointmentRequest || null,
          notes: notes || null,
        },
      },
    });

    // Add transcript as note
    const noteParts: string[] = [];
    if (transcript && transcript.trim()) {
      noteParts.push(`[Voice AI Conversation]\n\n${transcript}`);
    }
    if (notes && notes.trim()) {
      noteParts.push(`\n[Additional Notes]\n${notes}`);
    }
    if (appointmentRequest) {
      noteParts.push(`\n[Appointment Request]\n${JSON.stringify(appointmentRequest)}`);
    }

    if (noteParts.length > 0) {
      await prisma.note.create({
        data: {
          leadId: lead.id,
          userId: leadOwnerId,
          content: noteParts.join('\n'),
        },
      });
    }

    // Create booking appointment if requested
    if (appointmentRequest?.date && appointmentRequest?.time) {
      try {
        await prisma.bookingAppointment.create({
          data: {
            userId: leadOwnerId,
            leadId: lead.id,
            appointmentDate: new Date(`${appointmentRequest.date}T${appointmentRequest.time}`),
            status: 'SCHEDULED',
            notes: appointmentRequest.notes || 'Booked via Voice AI',
          },
        });
      } catch (bookingErr) {
        console.warn('[website-voice-lead] Booking creation failed:', bookingErr);
      }
    }

    const triggerType = leadSource.includes('Report') ? 'WEBSITE_SECRET_REPORT_LEAD' : 'WEBSITE_VOICE_AI_LEAD';
    // Trigger workflows: drip campaigns
    try {
      await processWebsiteTriggers(leadOwnerId, lead.id, triggerType, { websiteId });
    } catch (wfErr) {
      console.warn('[website-voice-lead] processWebsiteTriggers error:', wfErr);
    }

    // Trigger email/SMS drip campaigns
    try {
      await processCampaignTriggers({
        leadId: lead.id,
        userId: leadOwnerId,
        triggerType,
        metadata: { websiteId },
      });
    } catch (campErr) {
      console.warn('[website-voice-lead] processCampaignTriggers error:', campErr);
    }

    // Trigger workflows on lead creation (RE and industry auto-run)
    try {
      const user = await prisma.user.findUnique({
        where: { id: leadOwnerId },
        select: { industry: true },
      });
      if (user?.industry === 'REAL_ESTATE') {
        detectLeadWorkflowTriggers(leadOwnerId, lead.id).catch((err) => {
          console.error('[website-voice-lead] Workflow trigger failed:', err);
        });
      } else if (user?.industry) {
        const { detectIndustryLeadWorkflowTriggers } = await import('@/lib/industry-workflows/lead-triggers');
        detectIndustryLeadWorkflowTriggers(leadOwnerId, lead.id, user.industry).catch((err) => {
          console.error('[website-voice-lead] Industry workflow trigger failed:', err);
        });
      }
    } catch (wfErr) {
      console.warn('[website-voice-lead] Workflow trigger error:', wfErr);
    }

    console.log(`[website-voice-lead] Lead created: ${lead.id} (${name || '—'} ${email || '—'})`);

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[website-voice-lead] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lead' },
      { status: 500 }
    );
  }
}
