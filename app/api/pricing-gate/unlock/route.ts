import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailService } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID || "";
    if (leadOwnerId) {
      try {
        await prisma.lead.create({
          data: {
            userId: leadOwnerId,
            businessName: "Pricing Gate",
            contactPerson: email,
            email,
            source: "pricing_gate",
            tags: ["pricing-gate", "landing-page"],
          },
        });
      } catch (error) {
        console.error("Failed to store pricing gate lead:", error);
      }
    }

    const notifyEmail = process.env.DEMO_LEAD_NOTIFY_EMAIL || "info@soshogle.com";
    await emailService.sendEmail({
      to: notifyEmail,
      subject: "Pricing Unlocked Lead",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Pricing Unlocked</h2>
          <p><strong>Email:</strong> ${email}</p>
        </div>
      `,
    });

    const token = `pricing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("Error unlocking pricing:", error);
    return NextResponse.json({ error: "Failed to unlock pricing" }, { status: 500 });
  }
}
