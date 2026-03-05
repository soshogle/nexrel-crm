/**
 * REMOVED: Test onboarding endpoint exposed unauthenticated echo behavior.
 * Disabled as part of hardening sweep.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
