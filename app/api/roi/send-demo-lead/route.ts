import { NextResponse } from "next/server";
import { emailService } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { fullName, email, language, source } = await request.json();

    if (!fullName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const notifyEmail = process.env.DEMO_LEAD_NOTIFY_EMAIL || "info@soshogle.com";
    const subject = "New Demo Lead";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Demo Lead</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Language:</strong> ${language || "en"}</p>
        <p><strong>Source:</strong> ${source || "roi_calculator"}</p>
      </div>
    `;

    await emailService.sendEmail({
      to: notifyEmail,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending demo lead notification:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
