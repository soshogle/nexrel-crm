import { NextResponse } from "next/server";
import crypto from "crypto";
import { apiErrors } from "@/lib/api-error";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function signToken(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      (forwardedFor ? forwardedFor.split(",").at(-1)?.trim() : null) ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";

    const rlKey = getRateLimitKey(ip, "/api/landing-admin/login");
    const rlResult = await checkRateLimit(rlKey, RATE_LIMITS.auth);
    if (!rlResult.allowed) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rlResult.resetMs / 1000)),
        },
      });
    }

    const { username, password } = await request.json();
    const expectedUser = process.env.LANDING_ADMIN_USERNAME;
    const expectedPass = process.env.LANDING_ADMIN_PASSWORD;
    const secret = process.env.LANDING_ADMIN_SECRET;

    if (!expectedUser || !expectedPass || !secret) {
      return apiErrors.internal("Admin credentials not configured");
    }

    if (username !== expectedUser || password !== expectedPass) {
      return apiErrors.unauthorized("Invalid credentials");
    }

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const payload = `${username}.${expiresAt}`;
    const signature = signToken(payload, secret);
    const token = Buffer.from(`${payload}.${signature}`).toString("base64url");

    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    console.error("Admin login error:", error);
    return apiErrors.internal("Login failed");
  }
}
