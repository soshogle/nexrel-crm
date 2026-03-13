/**
 * Website Webhook Handler
 * Receives events from user websites and triggers workflows
 */

import { NextRequest, NextResponse } from "next/server";
import { getCrmDb, leadService } from "@/lib/dal";
import {
  createDalContext,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { workflowEngine } from "@/lib/workflow-engine";
import { processWebsiteTriggers } from "@/lib/website-triggers";
import { apiErrors } from "@/lib/api-error";
import { authorizeWebsiteSecret } from "@/lib/website-secret-auth";
import { runMasterConductorOperatorPreflight } from "@/lib/nexrel-ai-brain/master-conductor";

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-website-secret");

    const body = await request.json();
    const {
      websiteId,
      eventType, // 'visitor', 'form_submitted', 'payment_received', 'booking_created', 'cta_clicked', 'page_viewed'
      data,
    } = body;

    if (!websiteId || !eventType) {
      return apiErrors.badRequest("Website ID and event type are required");
    }

    const auth = await authorizeWebsiteSecret(websiteId, secret);
    if (!auth.ok) {
      return auth.status === 404
        ? apiErrors.notFound(auth.reason)
        : auth.status === 500
          ? apiErrors.internal(auth.reason)
          : apiErrors.unauthorized(auth.reason);
    }

    // Get website to find user (no session - fetch first to get userId)
    const website = await getCrmDb(
      createDalContext("bootstrap"),
    ).website.findUnique({
      where: { id: websiteId },
    });

    if (!website) {
      return apiErrors.notFound("Website not found");
    }

    // Map event types to workflow triggers
    const triggerMap: Record<string, string> = {
      visitor: "WEBSITE_VISITOR",
      form_submitted: "WEBSITE_FORM_SUBMITTED",
      payment_received: "WEBSITE_PAYMENT_RECEIVED",
      booking_created: "WEBSITE_BOOKING_CREATED",
      cta_clicked: "WEBSITE_CTA_CLICKED",
      page_viewed: "WEBSITE_PAGE_VIEWED",
    };

    const triggerType = triggerMap[eventType];
    if (!triggerType) {
      return NextResponse.json(
        { error: `Unknown event type: ${eventType}` },
        { status: 400 },
      );
    }

    const ctx = await resolveDalContext(website.userId);
    const db = getCrmDb(ctx);

    // Store visitor data if it's a visitor event
    if (eventType === "visitor") {
      await db.websiteVisitor.create({
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
    if (eventType === "form_submitted" && data.formData) {
      await db.websiteVisitor.create({
        data: {
          websiteId,
          sessionId: data.sessionId || `session-${Date.now()}`,
          formData: data.formData as any,
          interactions: {
            formSubmissions: [data.formData],
          } as any,
        },
      });

      // Create lead from form submission if configured
      const integration = await db.websiteIntegration.findFirst({
        where: {
          websiteId,
          type: "FORM",
          status: "ACTIVE",
        },
      });

      if (integration && (integration.config as any).createLead) {
        const lead = await leadService.create(ctx, {
          businessName:
            data.formData.name ||
            data.formData.businessName ||
            "Website Visitor",
          contactPerson: data.formData.name,
          email: data.formData.email,
          phone: data.formData.phone || null,
          source: "Website Form",
          status: "NEW",
          contactType: "CUSTOMER",
        } as any);
        // Auto-enroll in drip workflows with WEBSITE_FORM_SUBMITTED trigger
        await processWebsiteTriggers(
          website.userId,
          lead.id,
          "WEBSITE_FORM_SUBMITTED",
          { websiteId },
        );
      }
    }

    const preflight = await runMasterConductorOperatorPreflight({
      userId: website.userId,
      surface: "websites",
      objective: `website_event:${triggerType}`,
      requestedActions: [
        {
          type: "DRAFT_CAMPAIGN_ARTIFACT",
          riskTier: "LOW",
          reason: "Website event workflow trigger preflight",
          payload: {
            triggerType,
            websiteId,
            eventType,
          },
        },
      ],
    });

    if (!preflight.allowed) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Blocked by Nexrel AI master conductor policy",
      });
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
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Website webhook error:", error);
    return apiErrors.internal(error.message || "Webhook processing failed");
  }
}
