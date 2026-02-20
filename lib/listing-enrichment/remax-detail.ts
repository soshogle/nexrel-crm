/**
 * RE/MAX Quebec detail page scraper.
 * Extracts rich listing data from remax-quebec.com property pages.
 *
 * RE/MAX pages contain significantly more data than Centris:
 *   - Full description + addendum
 *   - Room-by-room details with dimensions, level, flooring
 *   - Building materials (siding, roofing)
 *   - Financial data (assessment, taxes, revenues)
 *   - Inclusions/exclusions
 *   - Water supply, sewage system
 *   - Proximity info
 *   - Full photo gallery
 *
 * Used as an alternating source with Centris to avoid rate limiting.
 */

import type { EnrichedData } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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
    .replace(/&#xE9;/g, "é")
    .replace(/&#xE8;/g, "è")
    .replace(/&#xEA;/g, "ê")
    .replace(/&#xE0;/g, "à")
    .replace(/&#xE2;/g, "â")
    .replace(/&#xF4;/g, "ô")
    .replace(/&#xFB;/g, "û")
    .replace(/&#xEE;/g, "î")
    .replace(/&#xE7;/g, "ç")
    .replace(/&#x[A-Fa-f0-9]+;/g, "")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a RE/MAX listing URL from a Centris MLS number.
 * RE/MAX Quebec uses a predictable URL pattern that includes the MLS number.
 */
export function buildRemaxSearchUrl(mlsNumber: string): string {
  return `https://www.remax-quebec.com/en/recherche/resultats?query=${mlsNumber}`;
}

/**
 * Extract gallery image URLs from a RE/MAX page.
 * RE/MAX uses media.remax-quebec.com CDN with sizes: www_thumb, www_medium, www_full.
 * URL pattern: media.remax-quebec.com/img/{size}/{bucket}/m{mlsNumber}-{type}{nn}-{seq}.jpg
 */
function extractRemaxImages(html: string): string[] {
  const urls = new Set<string>();

  // Primary: RE/MAX media CDN (matches anywhere in the HTML, not just src attributes)
  const remaxPattern = /media\.remax-quebec\.com\/img\/[^\s"')\]]+\.(?:jpg|jpeg|png|webp)[^\s"')\]]*/gi;
  let match: RegExpExecArray | null;
  while ((match = remaxPattern.exec(html)) !== null) {
    // Upgrade to full resolution
    let url = "https://" + match[0].replace(/www_(?:thumb|medium)/, "www_full");
    // Deduplicate URL-encoded vs non-encoded variants
    url = url.replace(/%3A/gi, ":").replace(/%2F/gi, "/");
    urls.add(url);
  }

  // Fallback: Centris media.ashx IDs (some RE/MAX pages embed these)
  const mediaAshxPattern = /media\.ashx\?id=([A-F0-9]+)/gi;
  while ((match = mediaAshxPattern.exec(html)) !== null) {
    urls.add(`https://mspublic.centris.ca/media.ashx?id=${match[1]}&t=pi&w=1024&h=768&sm=c`);
  }

  return Array.from(urls);
}

interface RoomDetail {
  name: string;
  level: string;
  dimensions: string;
  flooring?: string;
  details?: string;
}

/**
 * Parse room details from RE/MAX HTML.
 * RE/MAX pages list rooms with Level, Dimensions, Flooring, and Details.
 */
function parseRoomDetails(html: string): RoomDetail[] {
  const rooms: RoomDetail[] = [];

  // Match room blocks — each room has a name followed by level/dimensions/flooring/details
  const roomBlockPattern = /(?:Hall|Living\s*room|Dining\s*room|Kitchen|Bathroom|Powder\s*room|Primary\s*bedroom|Bedroom|Office|Family\s*room|Laundry\s*room|Den|Playroom|Storage|Recreation\s*room|Sunroom|Foyer|Walk-in\s*closet|Pantry|Loft|Mezzanine|Veranda|Balcony)\s*(?:Level|Niveau)\s*:\s*([^\n]*?)(?:Dimensions|Dimension)\s*:\s*([\d'"x X.irr]+)(?:\s*Flooring\s*:\s*([^\n]*?))?(?:\s*Details\s*:\s*([^\n]*?))?(?=\s*(?:Hall|Living|Dining|Kitchen|Bathroom|Powder|Primary|Bedroom|Office|Family|Laundry|Den|Playroom|Storage|Recreation|Sunroom|Foyer|Walk-in|Pantry|Loft|Mezzanine|Veranda|Balcony|Unit\s*\d|##|$))/gi;

  // Simpler approach: look for patterns in the stripped text
  const text = stripHtml(html);

  // Find room sections
  const roomNames = [
    "Hall", "Living room", "Dining room", "Kitchen", "Bathroom", "Powder room",
    "Primary bedroom", "Bedroom", "Office", "Family room", "Laundry room",
    "Den", "Playroom", "Storage", "Recreation room", "Sunroom", "Foyer",
    "Walk-in closet", "Pantry", "Loft", "Mezzanine", "Veranda", "Balcony",
  ];

  for (const roomName of roomNames) {
    const pattern = new RegExp(
      `${roomName}\\s+Level:\\s*([^\\n]+?)\\s+Dimensions?:\\s*([\\d'"x X.irr]+?)\\s+(?:Flooring:\\s*([^\\n]+?)\\s+)?(?:Details:\\s*([^\\n]*?)\\s+)?(?=${roomNames.join("|")}|Unit\\s*\\d|##|Financial|Characteristics|$)`,
      "gi"
    );

    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      rooms.push({
        name: roomName,
        level: m[1]?.trim() || "",
        dimensions: m[2]?.trim() || "",
        flooring: m[3]?.trim() || undefined,
        details: m[4]?.trim() || undefined,
      });
    }
  }

  return rooms;
}

/**
 * Scrape a RE/MAX Quebec listing page and extract enriched data.
 */
export async function scrapeRemaxDetail(url: string): Promise<EnrichedData | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`RE/MAX returned ${res.status} for ${url}`);
  }

  const html = await res.text();
  if (html.length < 1000) {
    throw new Error(`RE/MAX returned minimal HTML (${html.length} chars) — possible block`);
  }

  const text = stripHtml(html);
  const data: EnrichedData = {};

  // --- Description ---
  // Strategy 1: RE/MAX embeds structured JSON in the page with "description" field
  const jsonDescMatch = html.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (jsonDescMatch?.[1]) {
    const desc = jsonDescMatch[1]
      .replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
      .trim();
    if (desc.length > 40 && !desc.toLowerCase().startsWith("re/max") &&
        !desc.includes("Sign up") && !desc.includes("blog posts")) {
      data.description = desc;
    }
  }
  // Strategy 2: Find in body text by locating known RE/MAX content patterns
  if (!data.description) {
    const bodyPatterns = [
      /(?:for sale|for rent|à vendre|à louer)[^<]*?ULS[^<]*?(?:<[^>]*>)*\s*((?:[A-Z][^<]{59,3000}?))\s*(?=<h|Property features|Addendum)/i,
      /<p[^>]*>([^<]{60,3000})<\/p>/i,
    ];
    for (const p of bodyPatterns) {
      const m = html.match(p);
      if (m?.[1]) {
        const desc = stripHtml(m[1]);
        if (desc.length > 60 && !desc.includes("cookie") && !desc.includes("Terms of use") &&
            !desc.includes("Sign up") && !desc.includes("blog posts")) {
          data.description = desc;
          break;
        }
      }
    }
  }

  // --- Addendum ---
  const addendumMatch = html.match(/Addendum[\s\S]*?<\/h\d>\s*([\s\S]*?)(?=<h[23]|Building details|Room details|Characteristics|Financial|Inclusions)/i);
  if (addendumMatch?.[1]) {
    const addendum = stripHtml(addendumMatch[1]);
    if (addendum.length > 20) data.addendum = addendum;
  }

  // --- Year Built ---
  // Search in stripped text to avoid matching data attributes like data-v-5528c972
  const yearTextPatterns = [
    /Year\s*(?:constructed|built)\s+(\d{4})/i,
    /ann[ée]e\s*(?:de\s*)?construction\s+(\d{4})/i,
  ];
  for (const p of yearTextPatterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const yr = parseInt(m[1], 10);
      if (yr > 1800 && yr <= new Date().getFullYear() + 2) {
        data.yearBuilt = yr;
        break;
      }
    }
  }
  // Fallback: JSON data
  if (!data.yearBuilt) {
    const jsonYr = html.match(/"yearBuilt"\s*:\s*"?(\d{4})"?/i);
    if (jsonYr) {
      const yr = parseInt(jsonYr[1], 10);
      if (yr > 1800 && yr <= new Date().getFullYear() + 2) data.yearBuilt = yr;
    }
  }

  // --- Dimensions (building) ---
  const dimMatch = text.match(/Dimensions?\s+([\d'"x X.irr]+)/i);

  // --- Area ---
  const areaPatterns = [
    /Living\s*area[\s\S]{0,60}?([\d,. ]+)\s*(sqft|sq\s*ft|ft²|pi2|m²)/i,
    /([\d,]+)\s*(sqft|sq\.?\s*ft|ft²)\s*(?:living|habitable)/i,
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
  const lotMatch = text.match(/Lot\s*size\s+([\d'"x X.irr]+)/i);
  if (lotMatch) data.lotArea = lotMatch[1].trim();

  // --- Bedrooms / Bathrooms ---
  const bedMatch = text.match(/(\d+)\s*Bedrooms?/i);
  if (bedMatch) data.bedrooms = parseInt(bedMatch[1], 10);
  const bathMatch = text.match(/(\d+)\s*Bathrooms?/i);
  if (bathMatch) data.bathrooms = parseInt(bathMatch[1], 10);
  const powderMatch = text.match(/(\d+)\s*Powder\s*rooms?/i);
  if (powderMatch) {
    data.bathrooms = (data.bathrooms || 0) + parseInt(powderMatch[1], 10);
  }

  // --- Building Style ---
  const styleMatch = text.match(/(?:Building\s*style|Type)\s*:?\s*([A-Za-zÀ-ÿ\s,\-/]+?)(?=Year|Siding|Dimensions|Roofing|\d{4}|$)/i);
  if (styleMatch?.[1]) {
    const style = styleMatch[1].trim();
    if (style.length > 2 && style.length < 150) data.buildingStyle = style;
  }

  // --- Parking ---
  const parkingMatch = text.match(/Parking\s*(?:type|spaces?)?\s*:?\s*([A-Za-zÀ-ÿ\s(),\d\-]+?)(?=Water|Sewage|Proximity|Occupancy|$)/i);
  if (parkingMatch?.[1]) {
    const parking = parkingMatch[1].trim();
    if (parking.length > 1 && parking.length < 150) data.parking = parking;
  }

  // --- Features ---
  const amenities: string[] = [];
  const proximity: string[] = [];
  const inclusions: string[] = [];

  // Proximity
  const proxMatch = text.match(/Proximity\s+([\s\S]{5,300}?)(?=Water|Sewage|Parking|Occupancy|$)/i);
  if (proxMatch?.[1]) {
    const items = proxMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 100);
    proximity.push(...items);
  }

  // Inclusions
  const inclMatch = html.match(/Inclusions[\s\S]*?<\/h\d>\s*([\s\S]*?)(?=Exclusions|Desjardins|Mortgage|Newsletter|<\/section|<footer)/i);
  if (inclMatch?.[1]) {
    const cleanText = stripHtml(inclMatch[1]);
    const items = cleanText.split(/[,;.]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 200 && !s.startsWith("<") && !s.includes("div") && !s.includes("class="));
    inclusions.push(...items);
  }

  // --- Water / Sewage ---
  let waterSupply: string | undefined;
  let sewageSystem: string | undefined;
  const waterMatch = text.match(/Water\s*Supply\s+(\w[\w\s]*?)(?=Sewage|Occupancy|$)/i);
  if (waterMatch) waterSupply = waterMatch[1].trim();
  const sewageMatch = text.match(/Sewage\s*System\s+(\w[\w\s]*?)(?=Water|Occupancy|$)/i);
  if (sewageMatch) sewageSystem = sewageMatch[1].trim();

  // --- Building materials ---
  const sidingMatch = text.match(/Siding\s+([\w\s,]+?)(?=Roofing|Year|Dimensions|$)/i);
  const roofMatch = text.match(/Roofing\s+([\w\s,]+?)(?=Siding|Year|Dimensions|$)/i);
  if (sidingMatch) amenities.push(`Siding: ${sidingMatch[1].trim()}`);
  if (roofMatch) amenities.push(`Roofing: ${roofMatch[1].trim()}`);

  // --- Financial details ---
  const munTaxMatch = text.match(/Municipal\s*\(\d{4}\)\s*\$\s*([\d,]+)/i);
  if (munTaxMatch) data.municipalTax = `$${munTaxMatch[1]}`;
  const schTaxMatch = text.match(/School\s*\(\d{4}\)\s*\$\s*([\d,]+)/i);
  if (schTaxMatch) data.schoolTax = `$${schTaxMatch[1]}`;

  // --- Room Details ---
  const roomDetails = parseRoomDetails(html);
  if (roomDetails.length > 0) data.roomDetails = roomDetails;

  // --- Images ---
  const images = extractRemaxImages(html);
  if (images.length > 0) {
    data.galleryImages = images;
    data.mainImageUrl = images[0];
  }

  // --- Build features ---
  data.features = {
    heating: undefined,
    heatingEnergy: undefined,
    waterSupply,
    sewageSystem,
    amenities: amenities.length > 0 ? amenities : undefined,
    proximity: proximity.length > 0 ? proximity : undefined,
    inclusions: inclusions.length > 0 ? inclusions : undefined,
  };
  // Clean up empty features
  if (!data.features.waterSupply && !data.features.sewageSystem &&
      !data.features.amenities && !data.features.proximity && !data.features.inclusions) {
    delete data.features;
  }

  const hasData = data.description || data.yearBuilt || data.area || data.addendum ||
    (data.galleryImages && data.galleryImages.length > 1) ||
    (data.roomDetails && data.roomDetails.length > 0);

  return hasData ? data : null;
}

/**
 * Build a RE/MAX direct listing URL from an MLS number.
 * RE/MAX Quebec uses a search-based approach — we search for the MLS number
 * and the result page IS the listing page if there's an exact match.
 */
export function buildRemaxUrlFromCentrisUrl(centrisUrl: string, mlsNumber: string): string | null {
  // Centris URL pattern: /en/{type}~for-{sale|rent}~{city}/{mlsNumber}
  // RE/MAX URL pattern: /en/properties/{type}-for-{sale|rent}/{address}-{city}-{mlsNumber}
  // We can't perfectly reconstruct RE/MAX URLs, but we can search by MLS number
  return `https://www.remax-quebec.com/en/recherche/resultats?query=${mlsNumber}`;
}
