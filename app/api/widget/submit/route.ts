import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processReferralTriggers } from '@/lib/referral-triggers';
import { detectLeadWorkflowTriggers } from '@/lib/real-estate/workflow-triggers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/widget/submit - Public endpoint to receive form submissions from embedded widgets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, widgetId, formData } = body;

    // Validate required fields
    if (!userId || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, industry: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 404 }
      );
    }

    // Extract form data (ref = referrer lead id from ?ref= on the page)
    const {
      businessName,
      contactPerson,
      email,
      phone,
      website,
      address,
      city,
      message,
      ref: referralRef,
    } = formData;

    if (!businessName && !contactPerson && !email) {
      return NextResponse.json(
        { error: 'At least one of businessName, contactPerson, or email is required' },
        { status: 400 }
      );
    }

    const referrerLeadId =
      typeof referralRef === 'string' && referralRef.trim()
        ? referralRef.trim()
        : null;

    // If ref provided, resolve referrer and create referral + lead with source referral
    let referrerLead: { id: string } | null = null;
    if (referrerLeadId) {
      referrerLead = await prisma.lead.findFirst({
        where: { id: referrerLeadId, userId },
        select: { id: true },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        userId,
        businessName: businessName || contactPerson || 'Unknown Business',
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        city: city || null,
        source: referrerLead ? 'referral' : 'Embedded Widget',
        status: 'NEW',
        notes: message || null,
        enrichedData: {
          widgetId: widgetId || 'default',
          submittedAt: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || 'Unknown',
          referer: request.headers.get('referer') || 'Unknown',
          ...(referrerLeadId ? { referralRef: referrerLeadId } : {}),
        },
      },
    });

    if (referrerLead) {
      const referral = await prisma.referral.create({
        data: {
          userId,
          referrerId: referrerLead.id,
          referredName: contactPerson || businessName || 'Unknown',
          referredEmail: email || null,
          referredPhone: phone || null,
          status: 'CONVERTED',
          convertedLeadId: lead.id,
        },
      });
      try {
        await processReferralTriggers(userId, referrerLead.id, 'REFERRAL_CREATED');
        await processReferralTriggers(userId, lead.id, 'REFERRAL_CONVERTED');
      } catch (triggerError) {
        console.error('Referral trigger processing failed:', triggerError);
      }
    }

    // Trigger workflows on lead creation (RE and industry auto-run)
    if (user.industry === 'REAL_ESTATE') {
      detectLeadWorkflowTriggers(userId, lead.id).catch((err) => {
        console.error('[Widget] Failed to trigger workflow for lead:', err);
      });
    } else if (user.industry) {
      const { detectIndustryLeadWorkflowTriggers } = await import('@/lib/industry-workflows/lead-triggers');
      detectIndustryLeadWorkflowTriggers(userId, lead.id, user.industry).catch((err) => {
        console.error('[Widget] Failed to trigger industry workflows for lead:', err);
      });
    }

    console.log(`✅ New lead created from widget: ${lead.id}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Lead submitted successfully',
        leadId: lead.id,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    console.error('❌ Widget submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit form' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// OPTIONS /api/widget/submit - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
