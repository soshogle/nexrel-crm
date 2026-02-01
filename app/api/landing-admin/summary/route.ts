import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const secret = process.env.LANDING_ADMIN_SECRET;
    const authHeader = request.headers.get("authorization");
    if (!secret || !authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    let decoded = "";
    try {
      decoded = Buffer.from(token, "base64url").toString("utf8");
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parts = decoded.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [username, expiresAtRaw, signature] = parts;
    const payload = `${username}.${expiresAtRaw}`;
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (expectedSig !== signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expiresAt = Number(expiresAtRaw);
    if (!expiresAt || Date.now() > expiresAt) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    const leadOwnerId = process.env.DEMO_LEAD_OWNER_ID;
    if (!leadOwnerId) {
      return NextResponse.json({ leads: [], calls: [] });
    }

    const leads = await prisma.lead.findMany({
      where: {
        userId: leadOwnerId,
        OR: [
          { source: "soshogle_demo" },
          { source: "pricing_gate" },
          { source: "roi_calculator" },
          { source: "homepage_modal" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const calls = await prisma.callLog.findMany({
      where: {
        userId: leadOwnerId,
        OR: [
          { direction: "PREVIEW" },
          { toNumber: "+14509901011" },
          { fromNumber: "+14509901011" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        leadId: true,
        status: true,
        direction: true,
        fromNumber: true,
        toNumber: true,
        duration: true,
        recordingUrl: true,
        transcript: true,
        createdAt: true,
        elevenLabsConversationId: true,
      },
    });

    return NextResponse.json({ leads, calls });
  } catch (error) {
    console.error("Error loading landing admin summary:", error);
    return NextResponse.json({ error: "Failed to load admin data" }, { status: 500 });
  }
}
