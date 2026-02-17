/**
 * Tavus AI Lead Webhook
 * Receives leads from nexrel-service-template (Theodora site) when Tavus conversations end.
 * Creates lead in CRM with transcript as a Note, triggers workflows.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { detectLeadWorkflowTriggers } from '@/lib/real-estate/workflow-triggers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-tavus-webhook-secret');
    const expectedSecret = process.env.TAVUS_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadOwnerId = process.env.NEXREL_CRM_LEAD_OWNER_ID || process.env.DEMO_LEAD_OWNER_ID;
    if (!leadOwnerId) {
      return NextResponse.json(
        { error: 'NEXREL_CRM_LEAD_OWNER_ID or DEMO_LEAD_OWNER_ID not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, email, phone, transcript } = body;

    if (!name && !email) {
      return NextResponse.json(
        { error: 'At least name or email required' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: leadOwnerId },
      select: { id: true, industry: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid lead owner' }, { status: 404 });
    }

    const lead = await prisma.lead.create({
      data: {
        userId: leadOwnerId,
        businessName: name || 'Tavus AI Visitor',
        contactPerson: name || null,
        email: email || null,
        phone: phone || null,
        source: 'Tavus AI',
        status: 'NEW',
        enrichedData: {
          source: 'tavus_webhook',
          receivedAt: new Date().toISOString(),
        },
      },
    });

    // Add transcript as a Note
    if (transcript && transcript.trim()) {
      await prisma.note.create({
        data: {
          leadId: lead.id,
          userId: leadOwnerId,
          content: `[Tavus AI conversation]\n\n${transcript}`,
        },
      });
    }

    // Trigger workflows on lead creation (RE and industry auto-run)
    if (user.industry === 'REAL_ESTATE') {
      detectLeadWorkflowTriggers(leadOwnerId, lead.id).catch((err) => {
        console.error('[Tavus webhook] RE workflow trigger failed:', err);
      });
    } else if (user.industry) {
      const { triggerIndustryAutoRunOnLeadCreated } = await import('@/lib/ai-employees/auto-run-triggers');
      triggerIndustryAutoRunOnLeadCreated(leadOwnerId, lead.id, user.industry).catch((err) => {
        console.error('[Tavus webhook] Industry workflow trigger failed:', err);
      });
    }

    console.log(`[Tavus webhook] Lead created: ${lead.id} (${name || '—'} ${email || '—'})`);

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[Tavus webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lead' },
      { status: 500 }
    );
  }
}
