import { NextRequest, NextResponse } from "next/server";
import {
  getDependencyHealthOverview,
  recordDependencyResult,
} from "@/lib/reliability/dependency-health";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function probeOpenAI(): Promise<{ success: boolean; detail: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, detail: "OPENAI_API_KEY missing" };

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const success = response.ok;
    recordDependencyResult({
      dependency: "openai",
      source: "synthetic",
      success,
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
      message: response.statusText,
    });

    return {
      success,
      detail: success
        ? "OpenAI probe OK"
        : `OpenAI probe failed: ${response.status}`,
    };
  } catch (error: any) {
    recordDependencyResult({
      dependency: "openai",
      source: "synthetic",
      success: false,
      latencyMs: Date.now() - startedAt,
      message: error?.message || "Probe error",
    });
    return { success: false, detail: `OpenAI probe error: ${error?.message}` };
  }
}

async function probeElevenLabs(): Promise<{
  success: boolean;
  detail: string;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { success: false, detail: "ELEVENLABS_API_KEY missing" };

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: { "xi-api-key": apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const success = response.ok;
    recordDependencyResult({
      dependency: "elevenlabs",
      source: "synthetic",
      success,
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
      message: response.statusText,
    });

    return {
      success,
      detail: success
        ? "ElevenLabs probe OK"
        : `ElevenLabs probe failed: ${response.status}`,
    };
  } catch (error: any) {
    recordDependencyResult({
      dependency: "elevenlabs",
      source: "synthetic",
      success: false,
      latencyMs: Date.now() - startedAt,
      message: error?.message || "Probe error",
    });
    return {
      success: false,
      detail: `ElevenLabs probe error: ${error?.message}`,
    };
  }
}

async function probeTwilio(): Promise<{ success: boolean; detail: string }> {
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_PRIMARY_ACCOUNT_SID;
  const authToken =
    process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_PRIMARY_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { success: false, detail: "Twilio credentials missing" };
  }

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const success = response.ok;
    recordDependencyResult({
      dependency: "twilio",
      source: "synthetic",
      success,
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
      message: response.statusText,
    });

    return {
      success,
      detail: success
        ? "Twilio probe OK"
        : `Twilio probe failed: ${response.status}`,
    };
  } catch (error: any) {
    recordDependencyResult({
      dependency: "twilio",
      source: "synthetic",
      success: false,
      latencyMs: Date.now() - startedAt,
      message: error?.message || "Probe error",
    });
    return { success: false, detail: `Twilio probe error: ${error?.message}` };
  }
}

async function runMonitor(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return apiErrors.unauthorized();
  }

  const [openai, elevenlabs, twilio] = await Promise.all([
    probeOpenAI(),
    probeElevenLabs(),
    probeTwilio(),
  ]);

  return NextResponse.json({
    success: true,
    probes: { openai, elevenlabs, twilio },
    overview: getDependencyHealthOverview(),
  });
}

export async function POST(request: NextRequest) {
  return runMonitor(request);
}

export async function GET(request: NextRequest) {
  return runMonitor(request);
}
