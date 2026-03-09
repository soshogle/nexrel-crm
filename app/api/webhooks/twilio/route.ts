/**
 * Twilio SMS Webhook Handler
 * Receives incoming SMS messages from Twilio
 */

import { NextRequest, NextResponse } from "next/server";
import { TwilioService } from "@/lib/messaging-sync/twilio-service";
import { findConnectedChannelByIdentifier } from "@/lib/dal/webhook-channel-lookup";
import twilio from "twilio";
import { decrypt } from "@/lib/encryption";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const webhookData: any = {};

    // Convert FormData to object
    formData.forEach((value, key) => {
      webhookData[key] = value;
    });

    // Note: do not log webhookData — it contains phone numbers and message content (PII)

    // Get the phone number that received the message
    const toNumber = webhookData.To;

    // Find the channel connection for this Twilio number
    const channelConnection = await findConnectedChannelByIdentifier({
      channelType: "SMS",
      channelIdentifier: toNumber,
    });

    if (!channelConnection) {
      console.error("No channel connection found for Twilio number:", toNumber);
      return apiErrors.notFound("Channel connection not found");
    }

    // Get and decrypt Twilio credentials from provider data
    // Credentials are stored encrypted by messaging/connections/twilio/route.ts
    const providerData = channelConnection.providerData as any;
    const rawAccountSid = providerData?.accountSid;
    const rawAuthToken = providerData?.authToken;

    if (!rawAccountSid || !rawAuthToken) {
      console.error(
        "[twilio-webhook] Missing Twilio credentials in channel connection",
      );
      return apiErrors.badRequest("Invalid channel configuration");
    }

    let accountSid: string;
    let authToken: string;
    try {
      accountSid = decrypt(rawAccountSid);
      authToken = decrypt(rawAuthToken);
    } catch {
      console.error(
        "[twilio-webhook] Failed to decrypt Twilio credentials — check ENCRYPTION_SECRET",
      );
      return apiErrors.internal("Credential decryption failed");
    }

    // Validate webhook signature for security
    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    const url = req.url;
    const valid = twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      webhookData,
    );

    if (!valid && process.env.NODE_ENV === "production") {
      console.error("Invalid Twilio webhook signature");
      return apiErrors.unauthorized("Invalid signature");
    }

    // Process the incoming message
    const twilioService = new TwilioService(accountSid, authToken, toNumber);
    await twilioService.processIncomingMessage(
      webhookData,
      channelConnection.id,
      channelConnection.userId,
    );

    // Respond to Twilio with TwiML (empty response acknowledges receipt)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
        },
      },
    );
  } catch (error: any) {
    console.error("Error processing Twilio webhook:", error);
    return apiErrors.internal("Internal server error", error.message);
  }
}
