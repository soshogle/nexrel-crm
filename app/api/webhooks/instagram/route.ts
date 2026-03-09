/**
 * Instagram DM Webhook Handler
 * Receives incoming direct messages from Instagram
 */

import { NextRequest, NextResponse } from "next/server";
import { InstagramService } from "@/lib/messaging-sync/instagram-service";
import { findConnectedChannelByProviderAccount } from "@/lib/dal/webhook-channel-lookup";
import crypto from "crypto";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;

  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  return (
    expectedBuf.length === signatureBuf.length &&
    crypto.timingSafeEqual(expectedBuf, signatureBuf)
  );
}

export async function GET(req: NextRequest) {
  // Instagram webhook verification (same as Facebook)
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Support both INSTAGRAM_VERIFY_TOKEN and FACEBOOK_VERIFY_TOKEN (fallback)
  const verifyToken =
    process.env.INSTAGRAM_VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return process.env.NODE_ENV === "production"
      ? apiErrors.internal(
          "INSTAGRAM_VERIFY_TOKEN/FACEBOOK_VERIFY_TOKEN not configured",
        )
      : apiErrors.forbidden("Verification token not configured");
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Invalid verification token" },
    { status: 403 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifyMetaSignature(rawBody, signature)) {
      return apiErrors.forbidden("Invalid signature");
    }

    const webhookData = JSON.parse(rawBody);

    // Process each entry
    for (const entry of webhookData.entry || []) {
      const instagramAccountId = entry.id;

      // Find channel connection for this Instagram account
      const channelConnection = await findConnectedChannelByProviderAccount({
        channelType: "INSTAGRAM",
        providerAccountId: instagramAccountId,
      });

      if (!channelConnection) {
        console.log(
          "No channel connection found for Instagram account:",
          instagramAccountId,
        );
        continue;
      }

      // Process messaging events
      if (entry.messaging) {
        const instagramService = new InstagramService(
          channelConnection.accessToken!,
          instagramAccountId,
        );

        for (const messaging of entry.messaging) {
          // Only process incoming messages (not echoes)
          if (messaging.message && !messaging.message.is_echo) {
            await instagramService.processIncomingMessage(
              { entry: [{ messaging: [messaging] }] },
              channelConnection.id,
              channelConnection.userId,
            );
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Error processing Instagram webhook:", error);
    return apiErrors.internal("Internal server error", error.message);
  }
}
