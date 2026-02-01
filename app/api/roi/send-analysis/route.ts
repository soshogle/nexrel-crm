import { NextResponse } from "next/server";
import { emailService } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email, roiData, businessData } = await request.json();

    if (!email || !roiData || !businessData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const subject = "Your Soshogle ROI Analysis";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Your Business Impact Analysis</h2>
        <p>Here is a quick summary of your ROI analysis:</p>
        <ul>
          <li><strong>Annual Loss:</strong> $${Math.round(roiData.annualLoss).toLocaleString()}</li>
          <li><strong>Annual Recovery with Soshogle:</strong> $${Math.round(roiData.annualRecoveryWithSoshogle).toLocaleString()}</li>
          <li><strong>Net Annual Savings:</strong> $${Math.round(roiData.netAnnualSavings).toLocaleString()}</li>
          <li><strong>ROI:</strong> ${Math.round(roiData.roiPercentage)}%</li>
        </ul>
        <h3>Inputs</h3>
        <ul>
          <li>Average Ticket Price: $${businessData.avgTicketPrice}</li>
          <li>Calls Per Day: ${businessData.callsPerDay}</li>
          <li>Missed Calls Per Day: ${businessData.missedCallsPerDay}</li>
          <li>Lost Customer Percentage: ${Math.round(businessData.lostCustomerPercentage * 100)}%</li>
        </ul>
        <p>Reply to this email if you want a live demo tailored to your business.</p>
      </div>
    `;

    await emailService.sendEmail({
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending ROI analysis email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
