/**
 * Tier 3: Google Search fallback.
 * When a listing has no originalUrl or Centris blocks us, search Google
 * for the MLS number to find alternative listing pages (RE/MAX, Realtor.ca,
 * Royal LePage, etc.) and scrape from there.
 *
 * Uses SerpAPI (if SERPAPI_KEY is set) or direct Google scraping via Playwright.
 */

import type { EnrichedData } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Preferred real estate domains — ranked by data quality */
const PREFERRED_DOMAINS = [
  "centris.ca",
  "realtor.ca",
  "remax-quebec.com",
  "remax.ca",
  "royallepage.ca",
  "sutton.com",
  "kw.com",
  "zillow.com",
];

interface SearchResult {
  url: string;
  title: string;
  domain: string;
}

/**
 * Search Google for a listing using SerpAPI (preferred — no browser needed).
 */
async function searchViaSerpApi(query: string, apiKey: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    engine: "google",
    gl: "ca",
    hl: "en",
    num: "10",
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);
  const data = await res.json();

  return (data.organic_results || []).map((r: any) => ({
    url: r.link,
    title: r.title || "",
    domain: new URL(r.link).hostname.replace("www.", ""),
  }));
}

/**
 * Search Google via Playwright (fallback when no SerpAPI key).
 */
async function searchViaPlaywright(query: string): Promise<SearchResult[]> {
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: USER_AGENT,
    });

    const page = await context.newPage();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=ca&hl=en`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

    const results = await page.evaluate(() => {
      const items: { url: string; title: string }[] = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href") || "";
        const text = a.textContent || "";
        // Google wraps results in /url?q= or direct links
        let url = href;
        if (href.startsWith("/url?")) {
          const match = href.match(/[?&]q=([^&]+)/);
          if (match) url = decodeURIComponent(match[1]);
        }
        if (url.startsWith("http") && text.length > 5 && !url.includes("google.com")) {
          items.push({ url, title: text.slice(0, 200) });
        }
      });
      return items;
    });

    await browser.close();

    return results.map((r) => ({
      ...r,
      domain: new URL(r.url).hostname.replace("www.", ""),
    }));
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    throw err;
  }
}

/**
 * Pick the best search result based on domain preference.
 */
function pickBestResult(results: SearchResult[]): SearchResult | null {
  // Filter to real estate domains
  const reResults = results.filter((r) =>
    PREFERRED_DOMAINS.some((d) => r.domain.includes(d))
  );

  if (reResults.length === 0) return results[0] ?? null;

  // Sort by domain preference
  reResults.sort((a, b) => {
    const aIdx = PREFERRED_DOMAINS.findIndex((d) => a.domain.includes(d));
    const bIdx = PREFERRED_DOMAINS.findIndex((d) => b.domain.includes(d));
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  return reResults[0];
}

/** Extended data for CRM property creation */
export interface PropertyLookupData extends EnrichedData {
  listPrice?: number;
  mlsNumber?: string;
  virtualTourUrl?: string;
  daysOnMarket?: number;
  listingDate?: string;
}

/**
 * Scrape a generic real estate listing page for property data.
 * Extracts all fields needed for REProperty / REFSBOListing in the CRM.
 */
async function scrapeGenericListingPage(url: string): Promise<PropertyLookupData | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
  });

  if (!res.ok) return null;
  const html = await res.text();

  const data: PropertyLookupData = {};

  // MLS / Centris number — from URL or page
  const mlsFromUrl = url.match(/(?:mls|centris|listing)[\/\-_]?(\d{6,12})/i) || url.match(/\/(\d{8,12})(?:\/|$|\?)/);
  if (mlsFromUrl?.[1]) data.mlsNumber = mlsFromUrl[1];
  const mlsFromPage = html.match(/(?:MLS#?|Centris|ID)\s*:?\s*(\d{6,12})/i) || html.match(/listing[^\d]*(\d{8,12})/i);
  if (!data.mlsNumber && mlsFromPage?.[1]) data.mlsNumber = mlsFromPage[1];

  // Virtual tour URL
  const tourMatch = html.match(/(?:virtual\s*tour|visite\s*virtuelle|tour)[^"']*["'](https?:\/\/[^"']+)["']/i)
    || html.match(/href=["'](https?:\/\/[^"']*(?:matterport|tour|virtual|360)[^"']*)["']/i);
  if (tourMatch?.[1]) data.virtualTourUrl = tourMatch[1];

  // Days on market
  const domMatch = html.match(/(?:days?\s*on\s*market|DOM|jours?\s*sur\s*le\s*marché)\s*:?\s*(\d+)/i);
  if (domMatch?.[1]) data.daysOnMarket = parseInt(domMatch[1], 10);

  // Description — look for common patterns
  const descPatterns = [
    /(?:description|remarks|about)[^>]*>([^<]{50,2000})</i,
    /itemprop="description"[^>]*>([^<]{50,2000})/i,
    /<meta\s+name="description"\s+content="([^"]{50,500})"/i,
  ];
  for (const p of descPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      data.description = m[1].replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }

  // Year built
  const yearMatch = html.match(/(?:year\s*built|built\s*in|année)\s*:?\s*(\d{4})/i);
  if (yearMatch) data.yearBuilt = parseInt(yearMatch[1], 10);

  // Area / sqft
  const areaMatch = html.match(/([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|ft²|pi2|m²)/i);
  if (areaMatch) {
    data.area = areaMatch[1].replace(/,/g, "");
    data.areaUnit = areaMatch[2].includes("m") ? "m²" : "ft²";
  }

  // Lot size
  const lotMatch = html.match(/(?:lot\s*(?:size|area)|terrain|lot)\s*:?\s*([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|ft²|m²|acres?)/i);
  if (lotMatch?.[1]) data.lotArea = lotMatch[1].replace(/,/g, "");

  // Price — $X,XXX,XXX or X XXX XXX $ or similar
  const pricePatterns = [
    /\$[\s]*([\d,]+)(?:\s*(?:CAD|USD|\.?\d{2})?)?/,
    /(?:price|prix|asking)[^0-9]*\$?\s*([\d,]+)/i,
    /([\d,]+)\s*(?:CAD|USD|\$)/,
  ];
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const num = parseInt(m[1].replace(/,/g, ""), 10);
      if (num > 10000 && num < 100_000_000) {
        data.listPrice = num;
        break;
      }
    }
  }

  // Bedrooms / Bathrooms / Rooms
  const bedMatch = html.match(/(\d+)\s*(?:bed(?:room)?s?|chambres?)/i);
  if (bedMatch) data.bedrooms = parseInt(bedMatch[1], 10);
  const bathMatch = html.match(/(\d+)\s*(?:bath(?:room)?s?|salles?\s*de\s*bain)/i);
  if (bathMatch) data.bathrooms = parseInt(bathMatch[1], 10);
  const roomMatch = html.match(/(\d+)\s*(?:rooms?|pièces?)/i);
  if (roomMatch) data.rooms = parseInt(roomMatch[1], 10);

  // Property type / building style
  const typePatterns = [
    /(?:single\s*family|house|maison|detached)/i,
    /(?:condo|condominium|condominium)/i,
    /(?:townhouse|town\s*house|maison\s*de\s*ville)/i,
    /(?:multi[\s-]?family|duplex|triplex)/i,
    /(?:land|terrain)/i,
    /(?:commercial)/i,
  ];
  const typeLabels: Record<string, string> = {
    "single family": "SINGLE_FAMILY", house: "SINGLE_FAMILY", maison: "SINGLE_FAMILY", detached: "SINGLE_FAMILY",
    condo: "CONDO", condominium: "CONDO",
    townhouse: "TOWNHOUSE", "town house": "TOWNHOUSE", "maison de ville": "TOWNHOUSE",
    "multi-family": "MULTI_FAMILY", duplex: "MULTI_FAMILY", triplex: "MULTI_FAMILY",
    land: "LAND", terrain: "LAND",
    commercial: "COMMERCIAL",
  };
  for (const p of typePatterns) {
    const m = html.match(p);
    if (m) {
      const key = m[0].toLowerCase().replace(/\s+/g, " ");
      data.buildingStyle = typeLabels[key] || data.buildingStyle || m[0];
      break;
    }
  }

  // Features — amenities, proximity, heating, etc.
  const featureLists: string[] = [];
  const amenityMatch = html.match(/(?:amenities?|features?|équipements?)[^>]*>([^<]{20,800})</i);
  if (amenityMatch?.[1]) {
    const items = amenityMatch[1].split(/[,;•·|]/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 80);
    featureLists.push(...items);
  }
  const proximityMatch = html.match(/(?:proximity|nearby|à\s*proximité)[^>]*>([^<]{20,500})</i);
  if (proximityMatch?.[1]) {
    const items = proximityMatch[1].split(/[,;•·|]/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 80);
    featureLists.push(...items);
  }
  const heatingMatch = html.match(/(?:heating|chauffage)\s*:?\s*([^<]{3,80})/i);
  if (heatingMatch?.[1]) featureLists.push(`Heating: ${heatingMatch[1].trim()}`);
  const parkingMatch = html.match(/(?:parking|garage)\s*:?\s*([^<]{3,80})/i);
  if (parkingMatch?.[1]) {
    data.parking = parkingMatch[1].trim();
    featureLists.push(`Parking: ${data.parking}`);
  }
  if (featureLists.length > 0) {
    data.features = {
      ...data.features,
      amenities: [...new Set(featureLists)].slice(0, 30),
      proximity: data.features?.proximity || [],
    };
  }

  // Addendum
  const addendumMatch = html.match(/(?:addendum|additional\s*info|renseignements\s*supplémentaires)[^>]*>([^<]{30,1500})</i);
  if (addendumMatch?.[1]) data.addendum = addendumMatch[1].replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();

  // Taxes
  const taxMatch = html.match(/(?:municipal\s*tax|taxes\s*municipales)\s*:?\s*\$?\s*([\d,]+)/i);
  if (taxMatch?.[1]) data.municipalTax = taxMatch[1];
  const schoolTaxMatch = html.match(/(?:school\s*tax|taxes\s*scolaires)\s*:?\s*\$?\s*([\d,]+)/i);
  if (schoolTaxMatch?.[1]) data.schoolTax = schoolTaxMatch[1];

  // Images — gather high-quality image URLs
  const imgUrls: string[] = [];
  const imgPattern = /<img[^>]+src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    const imgUrl = imgMatch[1];
    if (!imgUrl.includes("logo") && !imgUrl.includes("icon") && !imgUrl.includes("avatar") &&
        !imgUrl.includes("placeholder") && imgUrl.length < 500) {
      imgUrls.push(imgUrl);
    }
  }
  if (imgUrls.length > 1) {
    data.galleryImages = [...new Set(imgUrls)].slice(0, 40);
    data.mainImageUrl = data.galleryImages[0];
  }

  const hasData = data.description || data.yearBuilt || data.area || data.listPrice || data.bedrooms || data.mlsNumber;
  return hasData ? data : null;
}

/**
 * Search for real estate listings. Uses SerpAPI, Google Custom Search, or Playwright.
 */
async function searchForListings(query: string): Promise<SearchResult[]> {
  const serpApiKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
  const googleCSEKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.GOOGLE_CSE_API_KEY;
  const googleCSECx = process.env.GOOGLE_CUSTOM_SEARCH_CX || process.env.GOOGLE_CSE_CX;

  if (serpApiKey) {
    return searchViaSerpApi(query, serpApiKey);
  }
  if (googleCSEKey && googleCSECx) {
    const params = new URLSearchParams({ q: query, key: googleCSEKey, cx: googleCSECx, num: "10" });
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((r: { link: string; title?: string }) => ({
      url: r.link,
      title: r.title || "",
      domain: new URL(r.link).hostname.replace("www.", ""),
    }));
  }
  return searchViaPlaywright(query);
}

/**
 * Tier 3: Find and scrape a listing via Google Search.
 * @param mlsNumber - MLS/Centris number
 * @param city - City name (for better search results)
 * @param address - Optional address for more precise matching
 */
export async function enrichViaGoogleSearch(
  mlsNumber: string,
  city?: string,
  address?: string
): Promise<{ data: EnrichedData | null; sourceUrl?: string }> {
  const query = `${mlsNumber} ${city || ""} ${address || ""} real estate listing`.trim();
  const results = await searchForListings(query);
  if (results.length === 0) return { data: null };
  const best = pickBestResult(results);
  if (!best) return { data: null };
  const data = await scrapeGenericListingPage(best.url);
  return { data, sourceUrl: best.url };
}

/**
 * Look up property by address — search online for listing data.
 * Returns all fields needed for REProperty / REFSBOListing in the CRM.
 */
export async function lookupPropertyByAddress(
  address: string,
  city?: string,
  state?: string
): Promise<{ data: PropertyLookupData; sourceUrl: string } | null> {
  const query = `${address} ${city || ""} ${state || ""} for sale real estate`.trim();
  const results = await searchForListings(query);
  if (results.length === 0) return null;
  const best = pickBestResult(results);
  if (!best) return null;
  const data = await scrapeGenericListingPage(best.url);
  if (!data || (!data.listPrice && !data.description && !data.bedrooms)) return null;
  return { data, sourceUrl: best.url };
}
