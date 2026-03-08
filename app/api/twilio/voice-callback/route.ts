import { NextRequest, NextResponse } from "next/server";
import { elevenLabsService } from "@/lib/elevenlabs";
import { resolveVoiceAgentByPhone } from "@/lib/dal";
import { enhancedCallHandler } from "@/lib/integrations/enhanced-call-handler";
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildFailoverTwiml(
  message: string,
  preferredNumber?: string | null,
  industry?: string | null,
): string {
  const safeMessage = escapeXml(message);
  const failoverNumber =
    normalizePhone(preferredNumber) ||
    resolveGlobalFailoverNumber({ industry: industry || null });

  if (failoverNumber) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${safeMessage}</Say>
  <Dial timeout="20">${escapeXml(failoverNumber)}</Dial>
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${safeMessage}</Say>
  <Hangup/>
</Response>`;
}

function asPhone(value: unknown): string | null {
  return normalizePhone(value);
}

/**
 * Twilio Voice Callback Endpoint
 *
 * Connects incoming Twilio calls to ElevenLabs AI agents via WebSocket streaming.
 * This endpoint is called by Twilio when a call comes in to a configured phone number.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const callStatus = formData.get("CallStatus") as string;

    // Find the voice agent (searches default + industry DBs)
    const resolved = await resolveVoiceAgentByPhone(to);
    if (!resolved) {
      console.error("[voice-callback] No voice agent found for number:", to);
      const twiml = buildFailoverTwiml(
        "Sorry, no AI agent is configured for this number. Forwarding your call now.",
      );
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const { voiceAgent, db } = resolved;
    const agentUser = (voiceAgent as any).user;
    const ownerFallbackNumber = asPhone(agentUser?.phone);
    const fallbackIndustry =
      (typeof agentUser?.industry === "string" ? agentUser.industry : null) ||
      (typeof (voiceAgent as any).businessIndustry === "string"
        ? ((voiceAgent as any).businessIndustry as string)
        : null);

    const preferredFailoverNumber =
      asPhone(voiceAgent.backupPhoneNumber) ||
      asPhone(voiceAgent.transferPhone) ||
      ownerFallbackNumber ||
      null;

    if (!voiceAgent.elevenLabsAgentId) {
      console.error(
        "[voice-callback] No ElevenLabs agent ID configured for:",
        voiceAgent.name,
      );
      const twiml = buildFailoverTwiml(
        "The AI assistant is not fully configured. Forwarding your call now.",
        preferredFailoverNumber,
        fallbackIndustry,
      );
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Enhanced call handling with screen pop
    let callLog;
    if (voiceAgent.type === "INBOUND") {
      const result = await enhancedCallHandler.handleIncomingCall(
        {
          callSid,
          fromNumber: from,
          toNumber: to,
          direction: "inbound",
          status: "ringing",
          timestamp: new Date(),
        },
        voiceAgent.userId,
        db,
        undefined,
      );
      callLog = result.callLog;

      if (result.patientMatch) {
        await enhancedCallHandler.sendScreenPopNotification(
          voiceAgent.userId,
          result.patientMatch,
          {
            callSid,
            fromNumber: from,
            toNumber: to,
            direction: "inbound",
            status: "ringing",
            timestamp: new Date(),
          },
        );
      }
    } else {
      callLog = await db.callLog.create({
        data: {
          voiceAgentId: voiceAgent.id,
          userId: voiceAgent.userId,
          twilioCallSid: callSid,
          direction: "OUTBOUND",
          fromNumber: from,
          toNumber: to,
          status: "IN_PROGRESS",
        },
      });
    }

    // Prepare current datetime context for the agent
    const now = new Date();
    const torontoTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "long",
      hour12: false,
    });

    const parts = torontoTime.formatToParts(now);
    const partsObj = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const dynamicVariables = {
      current_datetime: `${partsObj.year}-${partsObj.month}-${partsObj.day} ${partsObj.hour}:${partsObj.minute}`,
      current_day: partsObj.weekday,
      timezone: "America/Toronto (EST/EDT)",
    };

    // Get signed WebSocket URL from ElevenLabs with dynamic variables
    let signedUrl: string;
    try {
      signedUrl = await elevenLabsService.getSignedWebSocketUrl(
        voiceAgent.elevenLabsAgentId as string,
        dynamicVariables,
      );
    } catch (wsError: any) {
      console.error(
        "[voice-callback] Failed to get WebSocket URL:",
        wsError.message,
      );
      const twiml = buildFailoverTwiml(
        "The AI assistant is temporarily unavailable. Forwarding your call now.",
        preferredFailoverNumber,
        fallbackIndustry,
      );
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Verify the agent has a phone number assigned in ElevenLabs
    try {
      const agentDetails = await elevenLabsService.getAgent(
        voiceAgent.elevenLabsAgentId as string,
      );
      if (!agentDetails.phone_number_id) {
        console.error(
          "[voice-callback] Agent has no phone number assigned in ElevenLabs",
        );
        const twiml = buildFailoverTwiml(
          "The AI assistant is not fully configured. Forwarding your call now.",
          preferredFailoverNumber,
          fallbackIndustry,
        );
        return new NextResponse(twiml, {
          headers: { "Content-Type": "text/xml" },
        });
      }
    } catch (checkError: any) {
      console.error(
        "[voice-callback] Could not verify agent configuration:",
        checkError.message,
      );
      // Non-fatal — continue
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${signedUrl}" />
  </Connect>
</Response>`;

    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  } catch (error: any) {
    console.error("[voice-callback] Unhandled error:", error.message);
    const twiml = buildFailoverTwiml(
      "We hit a technical issue with the AI assistant. Forwarding your call now.",
    );
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Soshogle Call voice callback endpoint is running",
  });
}
