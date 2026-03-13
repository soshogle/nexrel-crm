import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  listLiveRunDevices,
  registerLiveRunDevice,
} from "@/lib/ai-employees/live-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const devices = await listLiveRunDevices(ctx);
    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    console.error("[live-run] devices list error", error);
    return apiErrors.internal(error?.message || "Failed to list devices");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();
    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const deviceId = String(body?.deviceId || "").trim();
    if (!deviceId) return apiErrors.badRequest("deviceId is required");

    await registerLiveRunDevice(ctx, {
      deviceId,
      label: String(body?.label || deviceId),
      os: String(body?.os || "unknown"),
      capabilities: Array.isArray(body?.capabilities)
        ? body.capabilities.map((v: any) => String(v))
        : [],
      allowedDomains: Array.isArray(body?.allowedDomains)
        ? body.allowedDomains.map((v: any) => String(v))
        : [],
      status: String(body?.status || "online"),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[live-run] register device error", error);
    return apiErrors.internal(error?.message || "Failed to register device");
  }
}
