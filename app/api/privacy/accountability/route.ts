import { NextResponse } from "next/server";
import { getPipedaAccountabilityProfile } from "@/lib/privacy/pipeda-accountability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const profile = getPipedaAccountabilityProfile();

  return NextResponse.json({
    success: true,
    profile,
    generatedAt: new Date().toISOString(),
  });
}
