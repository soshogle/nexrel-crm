import { NextResponse } from "next/server";
import crypto from "crypto";
import { apiErrors } from '@/lib/api-error';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function signToken(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(request: Request) {
  try {
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
