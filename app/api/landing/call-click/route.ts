import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID;
    if (!leadOwnerId) {
      return NextResponse.json({ success: true });
    }

    await prisma.callLog.create({
      data: {
        userId: leadOwnerId,
        direction: "OUTBOUND",
        status: "INITIATED",
        fromNumber: "web-visitor",
        toNumber: "+14509901011",
        callOutcome: "INFORMATION_PROVIDED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging call click:", error);
    return NextResponse.json({ error: "Failed to log call" }, { status: 500 });
  }
}
