import { NextRequest, NextResponse } from "next/server";
import { resolveVoiceAgentByPhone } from "@/lib/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function asPhone(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function buildFallbackTwiml(options: {
  message: string;
  fallbackNumber?: string | null;
  voicemailMessage?: string | null;
}): string {
  const safeMessage = escapeXml(options.message);
  const fallbackNumber = asPhone(options.fallbackNumber);

  if (fallbackNumber) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${safeMessage}</Say>
  <Dial timeout="20">${escapeXml(fallbackNumber)}</Dial>
</Response>`;
  }

  const fallbackVoicemail = asPhone(options.voicemailMessage)
    ? escapeXml(options.voicemailMessage as string)
    : "Please leave a message after the tone and the clinic will call you back.";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${safeMessage}</Say>
  <Say voice="Polly.Joanna">${fallbackVoicemail}</Say>
  <Record timeout="5" maxLength="120" playBeep="true" />
</Response>`;
}

/**
 * Twilio failover endpoint meant to be configured as webhook fallback URL.
 * It routes to per-agent transfer/backup number when available, then to
 * deployment-level fallback numbers.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = String(formData.get("To") || "");

    let perAgentFallback: string | null = null;
    let voicemailMessage: string | null = null;

    if (to) {
      try {
        const resolved = await resolveVoiceAgentByPhone(to);
        if (resolved?.voiceAgent) {
          perAgentFallback =
            asPhone(resolved.voiceAgent.backupPhoneNumber) ||
            asPhone(resolved.voiceAgent.transferPhone) ||
            null;
          voicemailMessage =
            typeof resolved.voiceAgent.voicemailMessage === "string"
              ? resolved.voiceAgent.voicemailMessage
              : null;
        }
      } catch (error) {
        console.error("[voice-fallback] Agent lookup failed:", error);
      }
    }

    const globalFallback =
      process.env.TWILIO_FAILOVER_NUMBER || process.env.CLINIC_FAILOVER_NUMBER;

    const twiml = buildFallbackTwiml({
      message:
        "Our AI assistant is temporarily unavailable. Connecting you to the clinic now.",
      fallbackNumber: perAgentFallback || globalFallback || null,
      voicemailMessage,
    });

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[voice-fallback] Unhandled error:", error);
    const twiml = buildFallbackTwiml({
      message:
        "We are temporarily unavailable. Please leave a message after the tone.",
      fallbackNumber:
        process.env.TWILIO_FAILOVER_NUMBER ||
        process.env.CLINIC_FAILOVER_NUMBER ||
        null,
    });

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Twilio voice fallback endpoint is running",
  });
}
