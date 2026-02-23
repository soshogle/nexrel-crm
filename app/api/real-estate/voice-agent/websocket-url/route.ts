/**
 * API Route: Get Signed WebSocket URL for Real Estate Voice Agent
 *
 * Uses the user's CRM voice agent (ElevenLabs) for real-time voice dialer.
 * Supports dynamic context (lead name, property, etc.) for personalized calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CrmVoiceAgentService } from "@/lib/crm-voice-agent";
import { ElevenLabsService } from "@/lib/elevenlabs";
import { apiErrors } from '@/lib/api-error';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const elevenLabsService = new ElevenLabsService();
const crmVoiceAgentService = new CrmVoiceAgentService();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json().catch(() => ({}));
    const { agentType, context } = body;

    // Get or create the user's CRM voice agent (industry-aware, supports real estate)
    const { agentId } = await crmVoiceAgentService.getOrCreateCrmVoiceAgent(session.user.id);

    // Build dynamic variables for real estate context
    const dynamicVariables: Record<string, string> = {};
    if (context?.leadName) dynamicVariables.lead_name = String(context.leadName);
    if (context?.propertyAddress) dynamicVariables.property_address = String(context.propertyAddress);
    if (context?.listedPrice) dynamicVariables.listed_price = String(context.listedPrice);
    if (context?.daysOnMarket) dynamicVariables.days_on_market = String(context.daysOnMarket);
    if (context?.script && Array.isArray(context.script)) {
      dynamicVariables.call_script = context.script.slice(0, 5).join(" | ");
    }

    const signedUrl = await elevenLabsService.getSignedWebSocketUrl(
      agentId,
      Object.keys(dynamicVariables).length > 0 ? dynamicVariables : undefined
    );

    return NextResponse.json({ signedUrl });
  } catch (error: any) {
    console.error("[Real Estate Voice] Error getting WebSocket URL:", error);
    return apiErrors.internal(error?.message || "Failed to get WebSocket URL");
  }
}
