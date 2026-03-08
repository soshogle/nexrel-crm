/**
 * Sync Twilio Phone Numbers
 *
 * This endpoint fetches ALL phone numbers from Twilio and:
 * 1. Saves them to local database (purchasedPhoneNumber table)
 * 2. Imports them to ElevenLabs for voice agent use
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const user = await db.user.findUnique({ where: { id: ctx.userId } });
    if (!user) return apiErrors.notFound("User not found");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("[phone-sync] Twilio credentials missing");
      return NextResponse.json(
        {
          error: "Twilio credentials not configured",
          details: "Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN",
        },
        { status: 500 },
      );
    }

    if (!ELEVENLABS_API_KEY) {
      console.error("[phone-sync] ElevenLabs API key missing");
      return NextResponse.json(
        {
          error: "ElevenLabs API key not configured",
          details: "Please set ELEVENLABS_API_KEY",
        },
        { status: 500 },
      );
    }

    // Check ElevenLabs subscription plan
    const { elevenLabsProvisioning } = await import(
      "@/lib/elevenlabs-provisioning"
    );
    const subscriptionCheck = await elevenLabsProvisioning.checkSubscription(
      user.id,
    );

    if (!subscriptionCheck.canUsePhoneNumbers) {
      console.error(
        "[phone-sync] ElevenLabs plan does not support phone numbers",
      );
      return NextResponse.json(
        {
          error: "ElevenLabs plan upgrade required",
          details:
            subscriptionCheck.error ||
            "Your ElevenLabs plan does not support phone number imports.",
          tier: subscriptionCheck.tier,
          upgradeRequired: true,
          upgradeUrl: "https://elevenlabs.io/pricing",
          recommendation:
            "Please upgrade to the Starter plan ($10/month) or higher to use phone numbers with voice agents.",
        },
        { status: 402 },
      );
    }

    // Fetch all phone numbers from Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    const twilioResponse = await fetch(twilioUrl, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
            "base64",
          ),
      },
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error("[phone-sync] Twilio fetch failed:", twilioResponse.status);
      return NextResponse.json(
        {
          error: "Failed to fetch Twilio phone numbers",
          details: `Twilio API returned status ${twilioResponse.status}. Please check your credentials.`,
          twilioError: error,
        },
        { status: 500 },
      );
    }

    const twilioData = await twilioResponse.json();
    const twilioNumbers = twilioData.incoming_phone_numbers || [];

    if (twilioNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No phone numbers found in your Twilio account",
        totalFound: 0,
        syncedToDatabase: 0,
        importedToElevenLabs: 0,
        errors: [],
        numbers: [],
        suggestion: "Purchase a phone number first from the Voice Agents page",
      });
    }

    const results = {
      totalFound: twilioNumbers.length,
      syncedToDatabase: 0,
      importedToElevenLabs: 0,
      errors: [] as string[],
      numbers: [] as any[],
    };

    for (const twilioNumber of twilioNumbers) {
      const phoneNumber = twilioNumber.phone_number;
      const friendlyName = twilioNumber.friendly_name || phoneNumber;

      try {
        const existingInDb = await db.purchasedPhoneNumber.findFirst({
          where: { phoneNumber, userId: ctx.userId },
        });

        if (!existingInDb) {
          await db.purchasedPhoneNumber.create({
            data: {
              userId: ctx.userId,
              phoneNumber,
              friendlyName,
              country: twilioNumber.iso_country || "US",
              capabilities: {
                voice: twilioNumber.capabilities?.voice || false,
                sms: twilioNumber.capabilities?.sms || false,
                mms: twilioNumber.capabilities?.mms || false,
              },
              twilioSid: twilioNumber.sid,
              status: "active",
            },
          });
          results.syncedToDatabase++;
        }

        const importResult = await elevenLabsProvisioning.importPhoneNumber(
          phoneNumber,
          "",
          ctx.userId,
        );

        if (importResult.success) {
          results.importedToElevenLabs++;
        } else {
          console.error(
            "[phone-sync] ElevenLabs import failed for",
            phoneNumber,
            ":",
            importResult.error,
          );
          results.errors.push(`${phoneNumber}: ${importResult.error}`);
        }

        results.numbers.push({
          phoneNumber,
          friendlyName,
          syncedToDb: true,
          importedToElevenLabs: importResult.success,
        });
      } catch (error: any) {
        console.error(
          "[phone-sync] Error processing",
          phoneNumber,
          ":",
          error.message,
        );
        results.errors.push(`${phoneNumber}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.syncedToDatabase} numbers to database, imported ${results.importedToElevenLabs} to ElevenLabs`,
      ...results,
    });
  } catch (error: any) {
    console.error("[phone-sync] Sync error:", error);
    return NextResponse.json(
      { error: "Phone number sync failed", details: error.message },
      { status: 500 },
    );
  }
}
