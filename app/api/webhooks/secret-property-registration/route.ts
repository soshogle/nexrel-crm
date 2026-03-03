/**
 * POST /api/webhooks/secret-property-registration
 * Buyer registers for ongoing secret/exclusive property access.
 * Captures detailed buyer criteria (budget, bedrooms, location, timeline)
 * and enrolls them in nurture campaigns automatically.
 *
 * Auth: x-website-secret header
 */
import { NextRequest, NextResponse } from 'next/server';
import { createDalContext, resolveDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';
import { processWebsiteTriggers } from '@/lib/website-triggers';
import { processCampaignTriggers } from '@/lib/campaign-triggers';
import { syncLeadCreatedToPipeline } from '@/lib/lead-pipeline-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      websiteId,
      name,
      email,
      phone,
      // Buyer criteria
      budgetMin,
      budgetMax,
      bedrooms,
      bathrooms,
      propertyTypes, // e.g. ["Condo", "Townhouse"]
      neighborhoods, // e.g. ["Plateau", "Griffintown"]
      moveTimeline,  // e.g. "1-3 months", "3-6 months", "6-12 months"
      preApproved,   // boolean
      notes,
    } = body;

    if (!websiteId || !name?.trim() || !email?.trim()) {
      return apiErrors.badRequest('websiteId, name, and email are required');
    }

    const ctx = createDalContext('bootstrap', null);
    const website = await getCrmDb(ctx).website.findUnique({
      where: { id: websiteId },
      select: { userId: true, name: true },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const userCtx = await resolveDalContext(website.userId);
    const db = getCrmDb(userCtx);

    // Check for existing lead by email
    const existingLead = await db.lead.findFirst({
      where: { userId: website.userId, email: email.trim() },
    });

    const buyerCriteria = {
      budgetMin: budgetMin || null,
      budgetMax: budgetMax || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      propertyTypes: propertyTypes || [],
      neighborhoods: neighborhoods || [],
      moveTimeline: moveTimeline || null,
      preApproved: preApproved ?? null,
    };

    let lead;
    if (existingLead) {
      // Merge buyer criteria into existing enrichedData
      const prevData = (existingLead.enrichedData as Record<string, any>) || {};
      lead = await db.lead.update({
        where: { id: existingLead.id },
        data: {
          phone: phone?.trim() || existingLead.phone,
          enrichedData: {
            ...prevData,
            buyerCriteria,
            secretPropertyRegistration: true,
            registeredAt: new Date().toISOString(),
          },
          tags: existingLead.tags
            ? (existingLead.tags as string[]).includes('Secret Property Buyer')
              ? existingLead.tags
              : [...(existingLead.tags as string[]), 'Secret Property Buyer']
            : ['Secret Property Buyer'],
        },
      });
    } else {
      lead = await db.lead.create({
        data: {
          userId: website.userId,
          businessName: name.trim(),
          contactPerson: name.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
          source: 'Secret Property Registration',
          status: 'NEW',
          tags: ['Secret Property Buyer'],
          enrichedData: {
            source: 'website_secret_property_registration',
            websiteId,
            buyerCriteria,
            secretPropertyRegistration: true,
            registeredAt: new Date().toISOString(),
          },
          contactType: 'CUSTOMER',
        } as any,
      });
    }

    // Add a detailed note with the buyer's criteria
    const criteriaLines = [
      `[Secret Property Buyer Registration]`,
      '',
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      phone ? `Phone: ${phone.trim()}` : null,
      '',
      '--- Buyer Criteria ---',
      budgetMin || budgetMax
        ? `Budget: ${budgetMin ? `$${Number(budgetMin).toLocaleString()}` : '?'} – ${budgetMax ? `$${Number(budgetMax).toLocaleString()}` : '?'}`
        : null,
      bedrooms ? `Bedrooms: ${bedrooms}+` : null,
      bathrooms ? `Bathrooms: ${bathrooms}+` : null,
      propertyTypes?.length ? `Property Types: ${propertyTypes.join(', ')}` : null,
      neighborhoods?.length ? `Neighborhoods: ${neighborhoods.join(', ')}` : null,
      moveTimeline ? `Timeline: ${moveTimeline}` : null,
      preApproved != null ? `Pre-approved: ${preApproved ? 'Yes' : 'No'}` : null,
      notes ? `\nNotes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await db.note.create({
      data: {
        leadId: lead.id,
        userId: website.userId,
        content: criteriaLines,
      },
    });

    // Trigger campaigns for secret property leads
    try {
      await processWebsiteTriggers(website.userId, lead.id, 'WEBSITE_SECRET_REPORT_LEAD', { websiteId });
    } catch (e) {
      console.warn('[secret-property-registration] trigger error:', e);
    }
    try {
      await processCampaignTriggers({
        leadId: lead.id,
        userId: website.userId,
        triggerType: 'WEBSITE_SECRET_REPORT_LEAD',
        metadata: { websiteId } as any,
      });
    } catch (e) {
      console.warn('[secret-property-registration] campaign trigger error:', e);
    }

    if (!existingLead) {
      syncLeadCreatedToPipeline(website.userId, lead).catch(() => {});
    }

    console.log(
      `[secret-property-registration] ${existingLead ? 'Updated' : 'Created'} lead ${lead.id} (${name} ${email})`
    );

    return NextResponse.json({ success: true, leadId: lead.id, isNew: !existingLead });
  } catch (error: any) {
    console.error('[secret-property-registration] Error:', error);
    return apiErrors.internal(error.message || 'Failed to process registration');
  }
}
