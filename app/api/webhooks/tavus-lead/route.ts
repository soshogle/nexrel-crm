/**
 * Tavus AI Lead Webhook
 * Receives leads from nexrel-service-template (Theodora site) when Tavus conversations end.
 * Creates lead in CRM with transcript as a Note, triggers workflows.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCrmDb, leadService, noteService } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import { detectLeadWorkflowTriggers } from '@/lib/real-estate/workflow-triggers';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-tavus-webhook-secret');
    const expectedSecret = process.env.TAVUS_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return apiErrors.unauthorized();
    }

    const leadOwnerId = process.env.NEXREL_CRM_LEAD_OWNER_ID || process.env.DEMO_LEAD_OWNER_ID;
    if (!leadOwnerId) {
      return apiErrors.internal('NEXREL_CRM_LEAD_OWNER_ID or DEMO_LEAD_OWNER_ID not configured');
    }

    const body = await request.json();
    const { name, email, phone, transcript } = body;

    if (!name && !email) {
      return apiErrors.badRequest('At least name or email required');
    }

    const ctx = createDalContext(leadOwnerId);
    const db = getCrmDb(ctx);

    // Validate user exists
    const user = await db.user.findUnique({
      where: { id: leadOwnerId },
      select: { id: true, industry: true },
    });

    if (!user) {
      return apiErrors.notFound('Invalid lead owner');
    }

    const lead = await leadService.create(ctx, {
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
      contactType: 'CUSTOMER',
    } as any);

    // Add transcript as a Note
    if (transcript && transcript.trim()) {
      await noteService.create(ctx, {
        leadId: lead.id,
        content: `[Tavus AI conversation]\n\n${transcript}`,
      });
    }

    // Trigger workflows on lead creation (RE and industry auto-run)
    if (user.industry === 'REAL_ESTATE') {
      detectLeadWorkflowTriggers(leadOwnerId, lead.id).catch((err) => {
        console.error('[Tavus webhook] RE workflow trigger failed:', err);
      });
    } else if (user.industry) {
      const { detectIndustryLeadWorkflowTriggers } = await import('@/lib/industry-workflows/lead-triggers');
      detectIndustryLeadWorkflowTriggers(leadOwnerId, lead.id, user.industry).catch((err) => {
        console.error('[Tavus webhook] Industry workflow trigger failed:', err);
      });
    }

    console.log(`[Tavus webhook] Lead created: ${lead.id} (${name || '—'} ${email || '—'})`);

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[Tavus webhook] Error:', error);
    return apiErrors.internal(error.message || 'Failed to create lead');
  }
}
