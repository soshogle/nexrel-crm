/**
 * POST /api/websites/[id]/book-meeting
 * Capture "Book a meeting" request from property evaluation success screen.
 * Creates lead with source market_appraisal_booking.
 * Auth: x-website-secret header.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmDb } from "@/lib/dal/db";
import { createDalContext } from "@/lib/context/industry-context";
import { leadService } from "@/lib/dal/lead-service";

export const dynamic = "force-dynamic";

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

    const website = await getCrmDb(createDalContext('bootstrap')).website.findFirst({
      where: { id: websiteId },
      select: { userId: true },
    });

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const ctx = createDalContext(website.userId);
    await leadService.create(ctx, {
      businessName: name.trim(),
      contactPerson: name.trim(),
      email: email.trim(),
      phone: (phone as string)?.trim() || null,
      source: "market_appraisal_booking",
      enrichedData: { wantsFullComparables: true },
    });

    return NextResponse.json({ success: true, message: "We'll be in touch to schedule your meeting." });
  } catch (error: any) {
    console.error("[book-meeting]", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit" },
      { status: 500 }
    );
  }
}
