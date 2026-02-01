import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { leadId, transcript, duration, recordingUrl, messages } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID;
    if (!leadOwnerId) {
      console.log("Demo conversation recorded (no owner configured)", {
        leadId,
        duration,
        recordingUrl,
        transcriptLength: transcript?.length || 0,
      });
      return NextResponse.json({ success: true });
    }

    await prisma.callLog.create({
      data: {
        userId: leadOwnerId,
        leadId,
        direction: "PREVIEW",
        status: "COMPLETED",
        fromNumber: "web-demo",
        toNumber: "ai-assistant",
        duration: duration ?? null,
        recordingUrl: recordingUrl || null,
        transcript: transcript || null,
        conversationData: messages ? JSON.stringify(messages) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording conversation:", error);
    return NextResponse.json({ error: "Failed to record conversation" }, { status: 500 });
  }
}
