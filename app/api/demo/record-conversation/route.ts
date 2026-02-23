import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiErrors } from '@/lib/api-error';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { leadId, transcript, duration, recordingUrl, messages } = await request.json();

    if (!leadId) {
      return apiErrors.badRequest("Missing leadId");
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
    return apiErrors.internal("Failed to record conversation");
  }
}
