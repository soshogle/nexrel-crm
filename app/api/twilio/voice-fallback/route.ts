import { NextRequest, NextResponse } from "next/server";
import { resolveVoiceAgentByPhone } from "@/lib/dal";
import {
  normalizePhone,
  resolveGlobalFailoverNumber,
} from "@/lib/reliability/voice-fallback";

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
  return normalizePhone(value);
}

function buildFallbackTwiml(options: {
  message: string;
  fallbackNumber?: string | null;
  voicemailMessage?: string | null;
  industry?: string | null;
}): string {
  const safeMessage = escapeXml(options.message);
  const fallbackNumber =
    asPhone(options.fallbackNumber) ||
    resolveGlobalFailoverNumber({ industry: options.industry || null });

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
    let ownerFallbackNumber: string | null = null;
    let fallbackIndustry: string | null = null;

    if (to) {
      try {
        const resolved = await resolveVoiceAgentByPhone(to);
        if (resolved?.voiceAgent) {
          perAgentFallback =
            asPhone(resolved.voiceAgent.backupPhoneNumber) ||
            asPhone(resolved.voiceAgent.transferPhone) ||
            null;
          ownerFallbackNumber = asPhone(
            (resolved.voiceAgent as any).user?.phone,
          );
          fallbackIndustry =
            (typeof (resolved.voiceAgent as any).user?.industry === "string"
              ? ((resolved.voiceAgent as any).user.industry as string)
              : null) ||
            (typeof (resolved.voiceAgent as any).businessIndustry === "string"
              ? ((resolved.voiceAgent as any).businessIndustry as string)
              : null);
          voicemailMessage =
            typeof resolved.voiceAgent.voicemailMessage === "string"
              ? resolved.voiceAgent.voicemailMessage
              : null;
        }
      } catch (error) {
        console.error("[voice-fallback] Agent lookup failed:", error);
      }
    }

    const twiml = buildFallbackTwiml({
      message:
        "Our AI assistant is temporarily unavailable. Connecting you to the clinic now.",
      fallbackNumber: perAgentFallback || ownerFallbackNumber || null,
      voicemailMessage,
      industry: fallbackIndustry,
    });

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[voice-fallback] Unhandled error:", error);
    const twiml = buildFallbackTwiml({
      message:
        "We are temporarily unavailable. Please leave a message after the tone.",
      fallbackNumber: null,
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
