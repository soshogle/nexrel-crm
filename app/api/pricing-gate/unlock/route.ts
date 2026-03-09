import { NextResponse } from "next/server";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { leadService } from "@/lib/dal/lead-service";
import { emailService } from "@/lib/email-service";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !emailRegex.test(email)) {
      return apiErrors.badRequest("Invalid email");
    }

    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID || "";
    if (leadOwnerId) {
      try {
        const ctx = await resolveDalContext(leadOwnerId);
        getCrmDb(ctx);
        await leadService.create(ctx, {
          businessName: "Pricing Gate",
          contactPerson: email,
          email,
          source: "pricing_gate",
          tags: ["pricing-gate", "landing-page"],
        });
      } catch (error) {
        console.error("Failed to store pricing gate lead:", error);
      }
    }

    const notifyEmail =
      process.env.DEMO_LEAD_NOTIFY_EMAIL || "info@soshogle.com";
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
    return apiErrors.internal("Failed to unlock pricing");
  }
}
