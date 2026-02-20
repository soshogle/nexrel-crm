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

/**
 * Scrape a generic real estate listing page for property data.
 * Works across multiple platforms by looking for common patterns.
 */
async function scrapeGenericListingPage(url: string): Promise<EnrichedData | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
  });

  if (!res.ok) return null;
  const html = await res.text();

  const data: EnrichedData = {};

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

  // Area
  const areaMatch = html.match(/([\d,]+)\s*(sq\.?\s*ft\.?|sqft|ft²|pi2|m²)/i);
  if (areaMatch) {
    data.area = areaMatch[1].replace(/,/g, "");
    data.areaUnit = areaMatch[2].includes("m") ? "m²" : "ft²";
  }

  // Bedrooms / Bathrooms
  const bedMatch = html.match(/(\d+)\s*(?:bed(?:room)?s?|chambres?)/i);
  if (bedMatch) data.bedrooms = parseInt(bedMatch[1], 10);
  const bathMatch = html.match(/(\d+)\s*(?:bath(?:room)?s?|salles?\s*de\s*bain)/i);
  if (bathMatch) data.bathrooms = parseInt(bathMatch[1], 10);

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

  const hasData = data.description || data.yearBuilt || data.area;
  return hasData ? data : null;
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
  const serpApiKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
  const query = `${mlsNumber} ${city || ""} ${address || ""} real estate listing`.trim();

  let results: SearchResult[];
  if (serpApiKey) {
    results = await searchViaSerpApi(query, serpApiKey);
  } else {
    results = await searchViaPlaywright(query);
  }

  if (results.length === 0) return { data: null };

  const best = pickBestResult(results);
  if (!best) return { data: null };

  const data = await scrapeGenericListingPage(best.url);
  return { data, sourceUrl: best.url };
}
