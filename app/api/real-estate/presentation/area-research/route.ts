export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/** Haversine formula: distance in miles between two lat/lng points */
function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Format distance for display */
function formatDistance(miles: number): string {
  if (miles < 0.1) return '< 0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

async function geocodeAddress(
  address: string,
  city: string,
  state: string
): Promise<GeocodeResult | null> {
  const query = [address, city, state].filter(Boolean).join(', ');
  if (!query.trim()) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      geometry: { location: { lat: number; lng: number } };
      formatted_address?: string;
    }>;
  };

  if (data.status !== 'OK' || !data.results?.[0]) return null;
  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
  };
}

interface PlaceResult {
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  vicinity?: string;
  types?: string[];
}

async function nearbySearch(
  lat: number,
  lng: number,
  type: string,
  radiusMeters = 8000
): Promise<PlaceResult[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${encodeURIComponent(type)}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      name: string;
      geometry?: { location?: { lat: number; lng: number } };
      rating?: number;
      vicinity?: string;
      types?: string[];
    }>;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.warn('[area-research] Nearby search error:', data.status, (data as any).error_message);
    return [];
  }

  return (data.results || []).map((r) => ({
    name: r.name,
    lat: r.geometry?.location?.lat ?? lat,
    lng: r.geometry?.location?.lng ?? lng,
    rating: r.rating,
    vicinity: r.vicinity,
    types: r.types,
  }));
}

/** Infer place type from Google types for display */
function inferType(types: string[] | undefined, fallback: string): string {
  if (!types?.length) return fallback;
  const t = types[0];
  if (t.includes('school') || t.includes('university')) return 'School';
  if (t.includes('restaurant') || t.includes('food')) return 'Restaurant';
  if (t.includes('mall') || t.includes('store') || t.includes('grocery')) return 'Shopping';
  if (t.includes('park')) return 'Park';
  if (t.includes('hospital') || t.includes('pharmacy') || t.includes('doctor')) return 'Healthcare';
  if (t.includes('transit') || t.includes('bus') || t.includes('airport')) return 'Transit';
  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return apiErrors.internal('Google Maps API not configured');
    }

    const body = await request.json();
    const { address, city, state, propertyType } = body;

    if (!address && !city) {
      return apiErrors.badRequest('Address or city required');
    }

    const loc = await geocodeAddress(address || '', city || '', state || '');
    if (!loc) {
      return apiErrors.badRequest('Could not geocode address. Please check the address and try again.');
    }

    const { lat, lng } = loc;
    const cityName = city || 'the area';
    const addressDisplay = address || loc.formattedAddress || 'this property';

    // Fetch real places in parallel (rate-limit friendly: one batch)
    const [schoolsRaw, restaurantsRaw, shoppingRaw, parksRaw, healthcareRaw, transitRaw] =
      await Promise.all([
        nearbySearch(lat, lng, 'school'),
        nearbySearch(lat, lng, 'restaurant'),
        nearbySearch(lat, lng, 'shopping_mall'),
        nearbySearch(lat, lng, 'park'),
        nearbySearch(lat, lng, 'hospital'),
        nearbySearch(lat, lng, 'transit_station'),
      ]);

    // Add grocery/pharmacy if shopping/healthcare are sparse
    let shopping = shoppingRaw;
    let healthcare = healthcareRaw;
    if (shopping.length < 2) {
      const grocery = await nearbySearch(lat, lng, 'grocery_or_supermarket');
      shopping = [...shopping, ...grocery].slice(0, 6);
    }
    if (healthcare.length < 2) {
      const pharmacy = await nearbySearch(lat, lng, 'pharmacy');
      healthcare = [...healthcare, ...pharmacy].slice(0, 6);
    }

    const withDistance = <T extends { lat: number; lng: number }>(
      items: T[],
      limit: number
    ): (T & { distanceMi: number })[] =>
      items
        .map((p) => ({ ...p, distanceMi: haversineMiles(lat, lng, p.lat, p.lng) }))
        .sort((a, b) => a.distanceMi - b.distanceMi)
        .slice(0, limit);

    const schools = withDistance(schoolsRaw, 4).map((s) => ({
      name: s.name,
      type: inferType(s.types, 'School'),
      rating: s.rating != null ? `${s.rating.toFixed(1)}/10` : undefined,
      distance: formatDistance(s.distanceMi),
    }));

    const dining = withDistance(restaurantsRaw, 4).map((r) => ({
      name: r.name,
      type: inferType(r.types, 'Restaurant'),
      distance: formatDistance(r.distanceMi),
    }));

    const shoppingList = withDistance(shopping, 4).map((s) => ({
      name: s.name,
      type: inferType(s.types, 'Shopping'),
      distance: formatDistance(s.distanceMi),
    }));

    const parks = withDistance(parksRaw, 4).map((p) => ({
      name: p.name,
      features: undefined,
      distance: formatDistance(p.distanceMi),
    }));

    const healthcareList = withDistance(healthcare, 4).map((h) => ({
      name: h.name,
      type: inferType(h.types, 'Healthcare'),
      distance: formatDistance(h.distanceMi),
    }));

    const transportation = withDistance(transitRaw, 4).map((t) => ({
      type: inferType(t.types, 'Transit'),
      name: t.name,
      distance: formatDistance(t.distanceMi),
    }));

    // Entertainment: libraries, movie theaters near the area
    const [librariesRaw, movieRaw] = await Promise.all([
      nearbySearch(lat, lng, 'library', 5000),
      nearbySearch(lat, lng, 'movie_theater', 8000),
    ]);
    const entertainment = withDistance([...librariesRaw, ...movieRaw], 4).map((e) => ({
      name: e.name,
      type: inferType(e.types, 'Entertainment'),
      distance: formatDistance(e.distanceMi),
    }));

    // Build summary from real data (no mock content)
    const parts: string[] = [];
    parts.push(`${cityName}${state ? `, ${state}` : ''} offers a variety of local amenities.`);
    if (schools.length) {
      parts.push(`Nearby schools include ${schools.slice(0, 2).map((s) => s.name).join(' and ')}.`);
    }
    if (shoppingList.length) {
      parts.push(`Shopping options include ${shoppingList.slice(0, 2).map((s) => s.name).join(', ')}.`);
    }
    if (parks.length) {
      parts.push(`Parks and recreation: ${parks.slice(0, 2).map((p) => p.name).join(', ')}.`);
    }
    if (transportation.length) {
      parts.push(`Transit access: ${transportation.slice(0, 2).map((t) => t.name).join(', ')}.`);
    }
    parts.push(`The neighborhood around ${addressDisplay} provides convenient access to these amenities.`);

    const summary = parts.join(' ');

    const research = {
      schools,
      transportation,
      shopping: shoppingList,
      dining,
      parks,
      healthcare: healthcareList,
      entertainment,
      demographics: {} as Record<string, string>,
      walkScore: undefined as number | undefined,
      bikeScore: undefined as number | undefined,
      transitScore: undefined as number | undefined,
      summary,
    };

    return NextResponse.json({ success: true, research });
  } catch (error) {
    console.error('Area research error:', error);
    return apiErrors.internal('Failed to research area');
  }
}
