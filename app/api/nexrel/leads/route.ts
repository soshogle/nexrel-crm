import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailService } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID || "";

    if (leadOwnerId) {
      try {
        await prisma.lead.create({
          data: {
            userId: leadOwnerId,
            businessName: payload.companyName || `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || "ROI Lead",
            contactPerson: `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || undefined,
            email: payload.email || undefined,
            phone: payload.phone || undefined,
            website: payload.websiteUrl || undefined,
            businessCategory: payload.industry || undefined,
            source: payload.source || "roi_calculator",
            tags: ["roi-calculator", "landing-page"],
          },
        });
      } catch (dbError) {
        console.error("Failed to store ROI lead:", dbError);
      }
    }

    const notifyEmail = process.env.DEMO_LEAD_NOTIFY_EMAIL || "info@soshogle.com";
    await emailService.sendEmail({
      to: notifyEmail,
      subject: "New ROI Lead",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New ROI Lead</h2>
          <p><strong>Name:</strong> ${payload.firstName || ""} ${payload.lastName || ""}</p>
          <p><strong>Email:</strong> ${payload.email || "N/A"}</p>
          <p><strong>Website:</strong> ${payload.websiteUrl || "N/A"}</p>
          <p><strong>Annual Loss:</strong> ${payload.annualLoss || "N/A"}</p>
          <p><strong>Annual Recovery:</strong> ${payload.annualRecovery || "N/A"}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating ROI lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
