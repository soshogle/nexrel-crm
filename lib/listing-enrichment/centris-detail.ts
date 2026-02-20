/**
 * Tier 1: Centris detail page scraper.
 * Fetches a Centris listing page and extracts all available property data
 * using HTML parsing (no browser needed — the main content is SSR).
 *
 * For the image gallery, we extract image IDs from the page source and
 * construct high-res URLs from Centris's CDN.
 */

import type { EnrichedData } from "./types";

const CENTRIS_CDN = "https://mspublic.centris.ca/media.ashx";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function extractBetween(html: string, before: string, after: string): string | null {
  const startIdx = html.indexOf(before);
  if (startIdx < 0) return null;
  const contentStart = startIdx + before.length;
  const endIdx = html.indexOf(after, contentStart);
  if (endIdx < 0) return null;
  return html.slice(contentStart, endIdx).trim();
}

function extractAllBetween(html: string, before: string, after: string): string[] {
  const results: string[] = [];
  let searchFrom = 0;
  while (true) {
    const startIdx = html.indexOf(before, searchFrom);
    if (startIdx < 0) break;
    const contentStart = startIdx + before.length;
    const endIdx = html.indexOf(after, contentStart);
    if (endIdx < 0) break;
    results.push(html.slice(contentStart, endIdx).trim());
    searchFrom = endIdx + after.length;
  }
  return results;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseYearBuilt(text: string): number | null {
  const match = text.match(/(?:Year\s+built|Built\s+in|Année\s+de\s+construction)\s*:?\s*(\d{4})/i);
  if (match) return parseInt(match[1], 10);
  const standalone = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
  return standalone ? parseInt(standalone[1], 10) : null;
}

function parseArea(text: string): { value: string; unit: string } | null {
  const match = text.match(/([\d,. ]+)\s*(sqft|sq\s*ft|sq\.?\s*ft\.?|pi2|ft²|m²|m2)/i);
  if (!match) return null;
  return {
    value: match[1].replace(/\s/g, "").trim(),
    unit: match[2].includes("m") ? "m²" : "ft²",
  };
}

function extractCentrisImageIds(html: string): string[] {
  const ids = new Set<string>();

  // Pattern 1: media.ashx?id=XXXX
  const mediaPattern = /media\.ashx\?id=([A-F0-9]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = mediaPattern.exec(html)) !== null) {
    ids.add(match[1]);
  }

  // Pattern 2: JSON data in page (photo arrays)
  const jsonPhotoPattern = /"id"\s*:\s*"([A-F0-9]{20,})"/gi;
  while ((match = jsonPhotoPattern.exec(html)) !== null) {
    ids.add(match[1]);
  }

  // Pattern 3: data attributes
  const dataPattern = /data-(?:photo|image|media)-?id="([A-F0-9]+)"/gi;
  while ((match = dataPattern.exec(html)) !== null) {
    ids.add(match[1]);
  }

  return Array.from(ids);
}

function buildImageUrl(imageId: string, width = 640, height = 480): string {
  // Centris CDN returns 0 bytes for sizes > 640x480
  return `${CENTRIS_CDN}?id=${imageId}&t=pi&w=${width}&h=${height}&sm=c`;
}

/**
 * Extract coordinates from page source.
 * Centris embeds lat/lng in the page for the map.
 */
function extractCoordinates(html: string): { lat: string; lng: string } | null {
  // Pattern: latitude longitude values near each other
  const patterns = [
    /(-?\d{2}\.\d{5,})\s+(-?\d{2,3}\.\d{5,})/,
    /"latitude"\s*:\s*"?(-?\d+\.\d+)"?\s*,\s*"longitude"\s*:\s*"?(-?\d+\.\d+)"?/i,
    /data-lat(?:itude)?="(-?\d+\.\d+)"\s+data-lng|lon(?:gitude)?="(-?\d+\.\d+)"/i,
    /lat(?:itude)?\s*[=:]\s*(-?\d{2}\.\d{4,})\D.*?lng|lon(?:gitude)?\s*[=:]\s*(-?\d{2,3}\.\d{4,})/is,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const lat = m[1];
      const lng = m[2];
      if (lat && lng && Math.abs(parseFloat(lat)) > 40 && Math.abs(parseFloat(lng)) > 50) {
        return { lat, lng };
      }
    }
  }
  return null;
}

/**
 * Extract text from raw HTML near a label, using tight boundaries.
 * Centris renders content in <span>/<div> elements next to label text.
 */
function extractNearLabel(html: string, label: string, maxLen = 300): string | null {
  const idx = html.indexOf(label);
  if (idx < 0) return null;
  const chunk = html.slice(idx + label.length, idx + label.length + maxLen);
  const text = stripHtml(chunk);
  // Take only the first meaningful "line" — stop at next section label
  const firstLine = text.split(/(?:Building style|Year built|Living area|Lot area|Parking|Additional|Move-in|Municipal|School|Centris No)/i)[0];
  return firstLine?.trim() || null;
}

/**
 * Scrape a single Centris listing page and extract enriched data.
 * Works via HTTP fetch + HTML parsing (no browser required).
 *
 * Uses multiple strategies: regex on raw HTML, JSON-LD, embedded script data,
 * and label-proximity text extraction to handle Centris's mixed SSR + JS rendering.
 */
export async function scrapeCentrisDetail(url: string): Promise<EnrichedData | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Centris returned ${res.status} for ${url}`);
  }

  const html = await res.text();
  if (html.length < 1000) {
    throw new Error(`Centris returned minimal HTML (${html.length} chars) — possible block`);
  }

  const data: EnrichedData = {};

  // --- Description (multiple strategies) ---
  // Strategy 1: Look for description in JSON-LD or structured data
  const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (ld.description && ld.description.length > 30) data.description = ld.description;
    } catch {}
  }
  // Strategy 2: meta description tag (often has the full listing description)
  if (!data.description) {
    const metaDesc = html.match(/<meta\s+(?:name|property)="(?:og:)?description"\s+content="([^"]{40,2000})"/i);
    if (metaDesc) data.description = metaDesc[1].replace(/&[^;]+;/g, " ").trim();
  }
  // Strategy 3: Look for description class/id in HTML
  if (!data.description) {
    const descPatterns = [
      /<div[^>]+class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<p[^>]+class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
      /itemprop="description"[^>]*>([\s\S]*?)</i,
      /<div[^>]+id="TextDescription"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+class="[^"]*descriptionContent[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const p of descPatterns) {
      const m = html.match(p);
      if (m?.[1]) {
        const text = stripHtml(m[1]);
        if (text.length > 30 && !text.toLowerCase().startsWith("house for sale")) {
          data.description = text.slice(0, 3000);
          break;
        }
      }
    }
  }
  // Strategy 4: Find long paragraphs that look like descriptions
  if (!data.description) {
    const longParas = html.match(/<p[^>]*>([^<]{60,2000})<\/p>/gi) || [];
    for (const para of longParas) {
      const text = stripHtml(para);
      if (text.length > 60 && !text.includes("cookie") && !text.includes("Terms of Use") &&
          !text.includes("Statistics Canada") && !text.includes("Calculate")) {
        data.description = text.slice(0, 3000);
        break;
      }
    }
  }

  // --- Year Built ---
  // The label and value are often in separate HTML elements: "Year built</div><div>2009</div>"
  const yearPatterns = [
    /Year\s*built[\s\S]{0,100}?(\d{4})/i,
    /"yearBuilt"\s*:\s*"?(\d{4})"?/i,
    /ann[ée]e\s*(?:de\s*)?construction[\s\S]{0,100}?(\d{4})/i,
  ];
  for (const p of yearPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const yr = parseInt(m[1], 10);
      if (yr > 1800 && yr <= new Date().getFullYear() + 2) {
        data.yearBuilt = yr;
        break;
      }
    }
  }

  // --- Living Area ---
  const areaPatterns = [
    /Living\s*area\s*(?:<[^>]*>\s*)*?([\d,. ]+)\s*(sqft|sq\s*ft|ft²|pi2|m²)/i,
    /Living\s*area[^<]{0,100}?([\d,. ]+)\s*(sqft|sq\s*ft|ft²|pi2|m²)/i,
    /"livingArea"\s*:\s*"?([\d,.]+)\s*(sqft|ft²|m²)?"?/i,
  ];
  for (const p of areaPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      data.area = m[1].replace(/\s/g, "").replace(/,/g, "");
      data.areaUnit = m[2]?.includes("m") ? "m²" : "ft²";
      break;
    }
  }

  // --- Lot Area ---
  const lotPatterns = [
    /Lot\s*area\s*(?:<[^>]*>\s*)*?([\d,. ]+)\s*(sqft|sq\s*ft|ft²|pi2|m²)/i,
    /Lot\s*area[^<]{0,100}?([\d,. ]+)\s*(sqft|sq\s*ft|ft²|pi2|m²)/i,
  ];
  for (const p of lotPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      data.lotArea = m[1].replace(/\s/g, "").replace(/,/g, "");
      break;
    }
  }

  // --- Building Style ---
  const stylePatterns = [
    /Building\s*style\s*(?:<[^>]*>\s*)*?([A-Za-zÀ-ÿ\s,\-/]+?)(?=<|Year|Living|Lot|Parking)/i,
    /Building\s*style[^<]{0,20}?([A-Za-zÀ-ÿ\s,\-/]{3,100})/i,
  ];
  for (const p of stylePatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const style = m[1].trim();
      if (style.length > 2 && style.length < 150) {
        data.buildingStyle = style;
        break;
      }
    }
  }
  if (!data.buildingStyle) {
    const nearLabel = extractNearLabel(html, "Building style");
    if (nearLabel && nearLabel.length > 2 && nearLabel.length < 150) data.buildingStyle = nearLabel;
  }

  // --- Parking ---
  const parkingPatterns = [
    /Parking\s*\(total\)\s*(?:<[^>]*>\s*)*?([A-Za-zÀ-ÿ\s(),\d\-]+?)(?=<|Additional|Move-in|Description)/i,
    /Parking[^<]{0,20}?(?:\(total\))?\s*([A-Za-zÀ-ÿ\s(),\d\-]{3,100})/i,
  ];
  for (const p of parkingPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const parking = m[1].trim();
      if (parking.length > 1 && parking.length < 150) {
        data.parking = parking;
        break;
      }
    }
  }

  // --- Additional Features / Amenities ---
  const amenities: string[] = [];
  const additionalMatch = html.match(/Additional\s*features?\s*(?:<[^>]*>\s*)*?([^<]{3,500})/i);
  if (additionalMatch?.[1]) {
    const items = additionalMatch[1].split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 100);
    amenities.push(...items);
  }

  // --- Move-in Date ---
  const moveInMatch = html.match(/Move-in\s*date\s*(?:<[^>]*>\s*)*?([^<]{5,200})/i);
  if (moveInMatch?.[1]) {
    const mid = moveInMatch[1].trim();
    if (mid.length > 3 && mid.length < 200) data.moveInDate = mid;
  }

  // --- Rooms / Bedrooms / Bathrooms ---
  const roomsMatch = html.match(/(\d+)\s*rooms?/i);
  if (roomsMatch) data.rooms = parseInt(roomsMatch[1], 10);
  const bedMatch = html.match(/(\d+)\s*bedrooms?/i);
  if (bedMatch) data.bedrooms = parseInt(bedMatch[1], 10);
  const bathMatch = html.match(/(\d+)\s*bath(?:rooms?)?/i);
  const powderMatch = html.match(/(\d+)\s*powder\s*rooms?/i);
  if (bathMatch || powderMatch) {
    data.bathrooms = (bathMatch ? parseInt(bathMatch[1], 10) : 0) +
      (powderMatch ? parseInt(powderMatch[1], 10) : 0);
  }

  // --- Financial details (tight extraction) ---
  const yearlyMunMatch = html.match(/Municipal\s*\(\d{4}\)\s*(?:<[^>]*>\s*)*?\$?([\d,]+)/i);
  if (yearlyMunMatch) data.municipalTax = `$${yearlyMunMatch[1]}`;
  const yearlySchMatch = html.match(/School\s*\(\d{4}\)\s*(?:<[^>]*>\s*)*?\$?([\d,]+)/i);
  if (yearlySchMatch) data.schoolTax = `$${yearlySchMatch[1]}`;

  // --- Coordinates ---
  const coords = extractCoordinates(html);
  if (coords) {
    data.latitude = coords.lat;
    data.longitude = coords.lng;
  }

  // NOTE: Centris masks image IDs in server-rendered HTML (anti-scraping).
  // The extracted IDs return 0-byte responses. Do NOT overwrite images here.
  // Images should come from RE/MAX or the original Apify sync.

  // --- Build features object ---
  if (amenities.length > 0 || data.buildingStyle || data.parking) {
    data.features = {
      amenities: amenities.length > 0 ? amenities : undefined,
      inclusions: data.parking ? [data.parking] : undefined,
    };
  }

  // Check if we got meaningful data
  const hasData = data.description || data.yearBuilt || data.area ||
    (data.galleryImages && data.galleryImages.length > 1);

  return hasData ? data : null;
}
