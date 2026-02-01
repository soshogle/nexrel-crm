import { NextResponse } from "next/server";
import { emailService } from "@/lib/email-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { leadId, email, fullName } = await request.json();

    if (!leadId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let transcript = "";
    let recordingUrl = "";
    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID;
    if (leadOwnerId) {
      const callLog = await prisma.callLog.findFirst({
        where: { leadId, userId: leadOwnerId },
        orderBy: { createdAt: "desc" },
        select: { transcript: true, recordingUrl: true },
      });
      transcript = callLog?.transcript || "";
      recordingUrl = callLog?.recordingUrl || "";
    }

    const subject = "Your Soshogle Demo Report";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Thanks for trying the demo, ${fullName || "there"}!</h2>
        <p>We captured your conversation and can walk you through a tailored demo.</p>
        ${recordingUrl ? `<p><strong>Recording:</strong> <a href="${recordingUrl}">Listen here</a></p>` : ""}
        ${transcript ? `<h3>Transcript</h3><pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${transcript}</pre>` : ""}
        <p>Reply to this email to continue the discussion.</p>
        <p style="color:#666;">Lead ID: ${leadId}</p>
      </div>
    `;

    await emailService.sendEmail({
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending lead report:", error);
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 });
  }
}
