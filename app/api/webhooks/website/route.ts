/**
 * Website Webhook Handler
 * Receives events from user websites and triggers workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { workflowEngine } from '@/lib/workflow-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      websiteId,
      eventType, // 'visitor', 'form_submitted', 'payment_received', 'booking_created', 'cta_clicked', 'page_viewed'
      data,
    } = body;

    if (!websiteId || !eventType) {
      return NextResponse.json(
        { error: 'Website ID and event type are required' },
        { status: 400 }
      );
    }

    // Get website to find user
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Map event types to workflow triggers
    const triggerMap: Record<string, string> = {
      visitor: 'WEBSITE_VISITOR',
      form_submitted: 'WEBSITE_FORM_SUBMITTED',
      payment_received: 'WEBSITE_PAYMENT_RECEIVED',
      booking_created: 'WEBSITE_BOOKING_CREATED',
      cta_clicked: 'WEBSITE_CTA_CLICKED',
      page_viewed: 'WEBSITE_PAGE_VIEWED',
    };

    const triggerType = triggerMap[eventType];
    if (!triggerType) {
      return NextResponse.json(
        { error: `Unknown event type: ${eventType}` },
        { status: 400 }
      );
    }

    // Store visitor data if it's a visitor event
    if (eventType === 'visitor') {
      await prisma.websiteVisitor.create({
        data: {
          websiteId,
          sessionId: data.sessionId || `session-${Date.now()}`,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referrer: data.referrer,
          pagesVisited: data.pagesVisited || [],
          interactions: data.interactions || {},
        },
      });
    }

    // Store form submission if it's a form event
    if (eventType === 'form_submitted' && data.formData) {
      await prisma.websiteVisitor.create({
        data: {
          websiteId,
          sessionId: data.sessionId || `session-${Date.now()}`,
          formData: data.formData,
          interactions: {
            formSubmissions: [data.formData],
          },
        },
      });

      // Create lead from form submission if configured
      const integration = await prisma.websiteIntegration.findFirst({
        where: {
          websiteId,
          type: 'FORM',
          status: 'ACTIVE',
        },
      });

      if (integration && (integration.config as any).createLead) {
        await prisma.lead.create({
          data: {
            userId: website.userId,
            businessName: data.formData.name || data.formData.businessName || 'Website Visitor',
            contactPerson: data.formData.name,
            email: data.formData.email,
            phone: data.formData.phone,
            source: 'Website Form',
            status: 'NEW',
          },
        });
      }
    }

    // Trigger workflows
    await workflowEngine.triggerWorkflow(
      triggerType,
      {
        userId: website.userId,
        variables: {
          websiteId,
          eventType,
          ...data,
        },
      },
      {
        websiteId,
        ...data,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Website webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
