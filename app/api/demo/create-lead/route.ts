import { NextResponse } from "next/server";
import { leadService } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";
import { emailService } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { fullName, email, phone, companyName, position, industry, websiteUrl } = await request.json();

    if (!fullName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID || "";
    let leadId = `demo-${Date.now()}`;

    if (leadOwnerId) {
      try {
        const ctx = createDalContext(leadOwnerId);
        const lead = await leadService.create(ctx, {
          businessName: companyName || fullName,
          contactPerson: fullName,
          email,
          phone: phone || null,
          website: websiteUrl || null,
          businessCategory: industry || undefined,
          source: "soshogle_demo",
          tags: ["demo", "landing-page"],
          contactType: position || "CUSTOMER",
        } as any);
        leadId = lead.id;
      } catch (dbError) {
        console.error("Failed to store demo lead:", dbError);
      }
    }

    const notifyEmail = process.env.DEMO_LEAD_NOTIFY_EMAIL || "info@soshogle.com";
    await emailService.sendEmail({
      to: notifyEmail,
      subject: "New Demo Lead",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Demo Lead</h2>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "N/A"}</p>
          <p><strong>Company:</strong> ${companyName || "N/A"}</p>
          <p><strong>Position:</strong> ${position || "N/A"}</p>
          <p><strong>Industry:</strong> ${industry || "N/A"}</p>
          <p><strong>Website:</strong> ${websiteUrl || "N/A"}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, leadId });
  } catch (error) {
    console.error("Error creating demo lead:", error);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
