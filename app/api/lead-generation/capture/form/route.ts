import { NextRequest, NextResponse } from "next/server";
import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";
import { validateLead } from "@/lib/lead-generation/data-validation";
import { scoreAndSaveLead } from "@/lib/lead-generation/lead-scoring-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/lead-generation/capture/form
 * Capture lead from embeddable form widget
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { fullName, email, phone, company, message, userId } = body;

    // Validate required fields
    if (!fullName || !email || !phone) {
      return apiErrors.badRequest("Missing required fields");
    }

    // Validate user ID
    if (!userId) {
      return apiErrors.badRequest("Missing user ID");
    }

    // Validate lead data
    const validation = await validateLead({
      businessName: company || fullName,
      email,
      phone,
    });

    // Create lead
    const ctx = await resolveDalContext(userId);
    const lead = await getCrmDb(ctx).lead.create({
      data: {
        businessName: company || fullName,
        contactPerson: fullName,
        email,
        phone,
        source: "form_widget",
        status: "NEW",
        validationScore: validation.validationScore,
        validationErrors: validation.validationErrors,
        qualityFlag: validation.qualityFlag,
        engagementHistory: {
          formSubmitted: true,
          formSubmittedAt: new Date().toISOString(),
          message,
        },
        contactType: "CUSTOMER",
      } as any,
    });

    // Score the lead
    try {
      await scoreAndSaveLead(lead.id, userId, null);
    } catch (error) {
      console.error("Error scoring lead:", error);
      // Continue even if scoring fails
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: "Lead captured successfully",
    });
  } catch (error) {
    console.error("Error capturing lead from form:", error);
    return apiErrors.internal("Failed to capture lead");
  }
}
