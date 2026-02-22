/**
 * POST /api/websites/[id]/property-evaluation
 * Run property evaluation and send to lead.
 * Auth: x-website-secret header (broker site server proxy).
 *
 * Body: { propertyDetails, contact: { name, email, phone } }
 * - propertyDetails: { address, city?, bedrooms?, bathrooms?, propertyType? }
 * - contact: { name, email, phone } — required to receive evaluation
 *
 * Returns display report with blurred comparables. Email sends blurred version (Option B).
 * Full comparables only after booking a meeting.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPropertyEvaluation } from "@/lib/real-estate/property-evaluation";
import type { ComparableProperty } from "@/lib/real-estate/property-evaluation";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Blur address: "123 Main St" -> "123 M*** St" */
function blurAddress(addr: string): string {
  const s = addr.trim();
  if (!s) return "••• ••••";
  const parts = s.split(/\s+/);
  if (parts.length < 2) return "••• ••••";
  const num = parts[0];
  const street = parts.slice(1).join(" ").split(",")[0].trim();
  const first = street.slice(0, 1);
  return `${num} ${first}***`;
}

/** Blur price: 450000 -> "$***,***" */
function blurPrice(price: number): string {
  const len = String(Math.round(price)).length;
  return "$" + "•".repeat(Math.min(len, 6));
}

function blurComparables(comparables: ComparableProperty[]): { addressBlurred: string; priceBlurred: string; bedrooms: number | null; bathrooms: number | null; status: string }[] {
  return comparables.map((c) => ({
    addressBlurred: blurAddress(c.address) + (c.city ? `, ${c.city}` : ""),
    priceBlurred: blurPrice(c.price),
    bedrooms: c.bedrooms,
    bathrooms: c.bathrooms,
    status: c.status,
  }));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await params;
    const secret = request.headers.get("x-website-secret");
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: { id: websiteId },
      select: {
        id: true,
        name: true,
        userId: true,
        neonDatabaseUrl: true,
        agencyConfig: true,
      },
    });

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const body = await request.json();
    const { propertyDetails, contact } = body;

    if (!propertyDetails?.address) {
      return NextResponse.json(
        { error: "Property address is required" },
        { status: 400 }
      );
    }

    if (!contact?.name || !contact?.email) {
      return NextResponse.json(
        { error: "Name and email are required to receive your evaluation" },
        { status: 400 }
      );
    }

    const evaluation = await runPropertyEvaluation(websiteId, {
      address: propertyDetails.address,
      city: propertyDetails.city,
      postalCode: propertyDetails.postalCode ?? propertyDetails.zip,
      latitude: propertyDetails.latitude,
      longitude: propertyDetails.longitude,
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
      propertyType: propertyDetails.propertyType,
      livingArea: propertyDetails.livingArea,
    });

    const blurredComparables = blurComparables(evaluation.comparables);

    // Create lead in CRM
    const user = await prisma.user.findUnique({
      where: { id: website.userId },
      select: { id: true, email: true },
    });

    const agencyConfig = (website.agencyConfig as Record<string, unknown> | null) || {};
    const replyToEmail =
      (agencyConfig.email as string)?.trim() || (user?.email as string)?.trim() || null;

    if (user) {
      const lead = await prisma.lead.create({
        data: {
          userId: user.id,
          businessName: contact.name || "Property Evaluation Visitor",
          contactPerson: contact.name || null,
          email: contact.email || null,
          phone: contact.phone || null,
          address: propertyDetails.address,
          source: "property_evaluation",
          enrichedData: {
            propertyEvaluation: true,
            estimatedValue: evaluation.estimatedValue,
            comparablesCount: evaluation.comparables.length,
            propertyDetails,
          },
        },
      });
      await prisma.note.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          content: `Property Evaluation: ${propertyDetails.address}\nEstimated value: $${evaluation.estimatedValue.toLocaleString()}\nComparables: ${evaluation.comparables.length}`,
        },
      });
    }

    // Send email with BLURRED comparables (Option B) — full comparables only after booking
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const emailHtml = buildEvaluationEmailHtmlBlurred(evaluation, contact.name, blurredComparables);

      await resend.emails.send({
        from: `Property Evaluation <${fromEmail}>`,
        to: contact.email,
        subject: `Your Property Evaluation: ${propertyDetails.address}`,
        html: emailHtml,
        ...(replyToEmail && replyToEmail.includes("@") ? { reply_to: replyToEmail } : {}),
      });
    }

    // Return display report for on-screen display (blurred comparables)
    return NextResponse.json({
      success: true,
      message: "Your evaluation is ready.",
      report: {
        address: evaluation.address,
        city: evaluation.city,
        estimatedValue: evaluation.estimatedValue,
        usedRegionalFallback: evaluation.usedRegionalFallback,
        comparablesBlurred: blurredComparables,
        comparablesCount: evaluation.comparables.length,
      },
      contact: { name: contact.name, email: contact.email, phone: contact.phone },
    });
  } catch (error: any) {
    console.error("[property-evaluation]", error);
    return NextResponse.json(
      { error: error.message || "Evaluation failed" },
      { status: 500 }
    );
  }
}

function buildEvaluationEmailHtmlBlurred(
  evaluation: any,
  name: string,
  blurredComparables: { addressBlurred: string; priceBlurred: string; bedrooms: number | null; bathrooms: number | null; status: string }[]
): string {
  const valueStr = evaluation.estimatedValue > 0
    ? `$${evaluation.estimatedValue.toLocaleString()}`
    : "Contact us for a detailed appraisal";
  const fallbackNote = evaluation.usedRegionalFallback
    ? "<p style='font-size:12px;color:#888;margin-top:8px;'>This estimate is based on regional market statistics. For a more accurate valuation, we recommend a personalized comparative market analysis.</p>"
    : "";

  let comparablesHtml = "";
  if (blurredComparables.length > 0) {
    comparablesHtml = `
      <h3 style="margin-top:24px;color:#214359;">Comparable Properties (Preview)</h3>
      <p style="font-size:13px;color:#666;">We found ${blurredComparables.length} comparable propert${blurredComparables.length === 1 ? "y" : "ies"} in your area. <strong>Book a meeting</strong> to unlock full addresses and sale prices.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;text-align:left;">Address</th>
          <th style="padding:8px;text-align:right;">Price</th>
          <th style="padding:8px;">Beds</th>
          <th style="padding:8px;">Baths</th>
          <th style="padding:8px;">Status</th>
        </tr>
        ${blurredComparables
          .map(
            (c) => `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;color:#888;">${c.addressBlurred}</td>
          <td style="padding:8px;text-align:right;color:#888;">${c.priceBlurred}</td>
          <td style="padding:8px;">${c.bedrooms ?? "—"}</td>
          <td style="padding:8px;">${c.bathrooms ?? "—"}</td>
          <td style="padding:8px;">${c.status}</td>
        </tr>
        `
          )
          .join("")}
      </table>
      <p style="margin-top:16px;font-size:13px;color:#214359;"><strong>Book a meeting</strong> to receive your full comparative market analysis with detailed comparable properties.</p>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Property Evaluation</title></head>
<body style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <h1 style="color:#214359;font-family:serif;">Your Property Evaluation</h1>
  <p>Hi ${name},</p>
  <p>Thank you for requesting a property evaluation. Here are the results for <strong>${evaluation.address}</strong>.</p>
  
  <div style="background:#f8f6f3;padding:20px;border-radius:8px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:#666;">Estimated Market Value</p>
    <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#214359;">${valueStr}</p>
  </div>

  <p style="font-size:13px;color:#666;">This estimate is based on comparable properties in your area. Book a meeting to receive your full comparative market analysis with detailed comparables.</p>
  ${fallbackNote}
  ${comparablesHtml}
  <p style="margin-top:32px;font-size:13px;color:#666;">Questions? Reply to this email or give us a call.</p>
</body>
</html>
  `;
}
