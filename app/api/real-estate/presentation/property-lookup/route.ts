export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';
import { lookupPropertyByAddress } from '@/lib/listing-enrichment/google-search';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function geocodeAddress(
  address: string,
  city: string,
  state: string
): Promise<{ city?: string; state?: string; zip?: string; formattedAddress?: string; latitude?: number; longitude?: number } | null> {
  const query = [address, city, state].filter(Boolean).join(', ');
  if (!query.trim() || !GOOGLE_MAPS_API_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      address_components?: Array<{ types: string[]; long_name: string; short_name: string }>;
    }>;
  };
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  const r = data.results[0];
  const out: {
    city?: string;
    state?: string;
    zip?: string;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
  } = { formattedAddress: r.formatted_address };
  r.address_components?.forEach((c) => {
    if (c.types.includes('locality')) out.city = c.long_name;
    if (c.types.includes('administrative_area_level_1')) out.state = c.short_name;
    if (c.types.includes('postal_code')) out.zip = c.long_name;
  });
  if (r.geometry?.location) {
    out.latitude = r.geometry.location.lat;
    out.longitude = r.geometry.location.lng;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json();
    const { address, city, state } = body;

    if (!address?.trim() && !city?.trim()) {
      return apiErrors.badRequest('Address or city is required');
    }

    const serpKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
    const googleCSEKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.GOOGLE_CSE_API_KEY;
    const googleCSECx = process.env.GOOGLE_CUSTOM_SEARCH_CX || process.env.GOOGLE_CSE_CX;

    if (!serpKey && !googleCSEKey) {
      return NextResponse.json(
        { error: 'Property lookup requires SERPAPI_KEY or GOOGLE_CUSTOM_SEARCH_API_KEY. Add one to enable online property search.' },
        { status: 503 }
      );
    }

    const addr = (address || '').trim();
    const c = (city || '').trim();
    const s = (state || '').trim();

    const result = await lookupPropertyByAddress(addr, c || undefined, s || undefined);

    if (!result) {
      return NextResponse.json({
        found: false,
        message: 'No listing found online for this address. You can still enter details manually.',
        property: null,
      });
    }

    const { data, sourceUrl } = result;

    const geocoded = addr || c ? await geocodeAddress(addr, c, s) : null;
    const fullAddress = addr || geocoded?.formattedAddress?.split(',')[0]?.trim() || '';
    const unitMatch = fullAddress.match(/(?:apt|unit|#|suite|appt\.?)\s*\.?\s*([a-z0-9\-]+)/i);
    const streetAddress = unitMatch ? fullAddress.replace(unitMatch[0], '').replace(/\s*,\s*$/, '').trim() : fullAddress;
    const unit = unitMatch?.[1] || undefined;

    const featuresFlat = [
      ...(data.features?.amenities || []),
      ...(data.features?.proximity || []),
      ...(data.features?.inclusions || []),
    ].filter(Boolean);
    if (data.parking) featuresFlat.push(`Parking: ${data.parking}`);
    if (data.features?.heating) featuresFlat.push(`Heating: ${data.features.heating}`);

    const property = {
      address: streetAddress,
      unit,
      city: c || geocoded?.city,
      state: s || geocoded?.state,
      zipCode: geocoded?.zip,
      country: s === 'QC' || (geocoded?.state === 'QC') ? 'CA' : 'US',
      price: data.listPrice != null ? String(data.listPrice) : '',
      beds: data.bedrooms != null ? String(data.bedrooms) : '',
      baths: data.bathrooms != null ? String(data.bathrooms) : '',
      sqft: data.area ? String(data.area).replace(/[^0-9]/g, '') : '',
      lotSize: data.lotArea || '',
      yearBuilt: data.yearBuilt != null ? String(data.yearBuilt) : '',
      propertyType: data.buildingStyle || 'Single Family',
      description: data.description || '',
      features: featuresFlat,
      photos: data.galleryImages || (data.mainImageUrl ? [data.mainImageUrl] : []),
      mlsNumber: data.mlsNumber || undefined,
      virtualTourUrl: data.virtualTourUrl || undefined,
      daysOnMarket: data.daysOnMarket != null ? data.daysOnMarket : undefined,
      addendum: data.addendum || undefined,
      municipalTax: data.municipalTax || undefined,
      schoolTax: data.schoolTax || undefined,
      rooms: data.rooms != null ? data.rooms : undefined,
      parking: data.parking || undefined,
      brokerName: data.brokerName || undefined,
      brokerAgency: data.brokerAgency || undefined,
      brokerPhone: data.brokerPhone || undefined,
      latitude: geocoded?.latitude,
      longitude: geocoded?.longitude,
      sourceUrl,
    };

    return NextResponse.json({
      found: true,
      property,
      sourceUrl,
    });
  } catch (error) {
    console.error('Property lookup error:', error);
    return apiErrors.internal('Property lookup failed');
  }
}
