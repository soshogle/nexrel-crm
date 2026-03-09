import { NextResponse } from "next/server";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID;
    if (!leadOwnerId) {
      return NextResponse.json({ success: true });
    }

    const ctx = await resolveDalContext(leadOwnerId);
    const db = getCrmDb(ctx);

    await db.callLog.create({
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
    return apiErrors.internal("Failed to log call");
  }
}
