/**
 * Reverse geocode lat/lng to Canadian postal code via Google Maps.
 * Used when Apify scrapers (Centris, Realtor) don't return postal_code.
 */
export async function reverseGeocodePostalCode(
  lat: number,
  lng: number,
  apiKey: string
): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{ address_components?: Array<{ types: string[]; long_name: string }> }>;
  };
  for (const r of data.results ?? []) {
    for (const c of r.address_components ?? []) {
      if (
        c.types.includes("postal_code") &&
        /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(c.long_name.replace(/\s/g, ""))
      ) {
        return c.long_name.replace(/\s/g, "").toUpperCase();
      }
    }
  }
  return null;
}

/** Enrich properties with postal_code from lat/lng when missing */
export async function enrichPostalCodesFromLatLng(
  properties: Record<string, unknown>[]
): Promise<void> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.warn("[sync] GOOGLE_MAPS_API_KEY not set — skipping postal code enrichment");
    return;
  }
  const needEnrich = properties.filter(
    (p) =>
      !p.postal_code &&
      typeof p.latitude === "number" &&
      typeof p.longitude === "number" &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude)
  );
  if (needEnrich.length === 0) return;
  console.log(
    `[sync] Enriching postal codes for ${needEnrich.length} properties (lat/lng → Google Geocoding)`
  );
  for (let i = 0; i < needEnrich.length; i++) {
    const p = needEnrich[i];
    const pc = await reverseGeocodePostalCode(p.latitude as number, p.longitude as number, key);
    if (pc) p.postal_code = pc;
    if (i < needEnrich.length - 1) await new Promise((r) => setTimeout(r, 50)); // ~20 req/s
  }
}
