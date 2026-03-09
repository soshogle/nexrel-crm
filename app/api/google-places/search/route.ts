export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const { location, category } = await request.json();

    if (!location || !category) {
      return apiErrors.badRequest("Location and category are required");
    }

    // Try user's stored key first, fall back to global env key
    const userApiKey = await db.apiKey.findFirst({
      where: {
        userId: session.user.id,
        service: "google_places",
        isActive: true,
      },
    });

    const resolvedKey = userApiKey?.keyValue || process.env.GOOGLE_MAPS_API_KEY;

    if (!resolvedKey) {
      return apiErrors.badRequest("Google Places API key not configured");
    }

    // Search for places using Google Places API
    const query = `${category} in ${location}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${resolvedKey}`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data);
      return NextResponse.json(
        {
          error: `Google Places API error: ${data.error_message || data.status}`,
        },
        { status: 400 },
      );
    }

    // Get detailed information for each place
    const detailedResults = [];

    for (const place of (data.results || []).slice(0, 10)) {
      // Limit to 10 results
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,business_status,types&key=${resolvedKey}`;

        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status === "OK") {
          detailedResults.push(detailsData.result);
        } else {
          // Fallback to basic info if details fail
          detailedResults.push({
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
            rating: place.rating,
            types: place.types,
            business_status: place.business_status,
          });
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
        // Continue with next place
      }
    }

    return NextResponse.json({
      results: detailedResults,
      status: data.status,
    });
  } catch (error) {
    console.error("Google Places search error:", error);
    return apiErrors.internal();
  }
}
