/**
 * GET /api/maps/js
 * Proxies Google Maps JavaScript API. Keeps API key server-side.
 * Used by real estate broker sites (nexrel-service-template) so they don't need
 * GOOGLE_MAPS_API_KEY per deployment — one key in the CRM works for all agents.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Maps not configured: set GOOGLE_MAPS_API_KEY in CRM" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const v = searchParams.get("v") || "weekly";
  const libraries = searchParams.get("libraries") || "marker,places,geocoding,geometry";

  const url = `https://maps.googleapis.com/maps/api/js?key=${key}&v=${v}&libraries=${libraries}`;

  try {
    const resp = await fetch(url);
    const body = await resp.text();
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[api/maps/js]", err);
    return new NextResponse("Failed to load Maps script", { status: 502 });
  }
}
