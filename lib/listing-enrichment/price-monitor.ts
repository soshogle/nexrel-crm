/**
 * Price Monitor — Detects price changes on existing listings by scraping
 * Centris/Google and comparing to what's stored in the CRM.
 *
 * Flow:
 *   1. Load active listings from CRM (REProperty + RERentalListing)
 *   2. For each, scrape the current Centris page (or fallback to Google Search)
 *   3. Extract the live price
 *   4. Compare to stored price — if different, log a REPriceChange and update
 *   5. Push changed prices to the owner's website DB
 */

import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";
import { scrapeCentrisDetail } from "./centris-detail";
import {
  enrichViaGoogleSearch,
  type PropertyLookupData,
} from "./google-search";
import { syncListingToWebsite } from "@/lib/website-builder/listings-service";

const DELAY_MS = 2000;
const MAX_PER_RUN = 50;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extract price from a Centris listing page HTML */
function extractPriceFromHtml(html: string): number | null {
  const patterns = [
    /\$\s*([\d,\s]+)(?:\s*(?:CAD|\/mth|\/mo|\/month))?/,
    /(?:price|prix|asking)\s*[:\s]*\$?\s*([\d,\s]+)/i,
    /([\d,\s]+)\s*(?:CAD|\$)/,
    /"price"\s*:\s*"?\$?([\d,]+)"?/i,
    /"listPrice"\s*:\s*"?([\d,]+)"?/i,
    /itemprop="price"\s+content="([\d.]+)"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const num = parseInt(m[1].replace(/[\s,]/g, ""), 10);
      if (num > 10_000 && num < 100_000_000) return num;
    }
  }
  return null;
}

/** Extract rent price from page HTML */
function extractRentPriceFromHtml(html: string): number | null {
  const patterns = [
    /\$\s*([\d,]+)\s*\/\s*(?:mth|mo|month|mois)/i,
    /(?:rent|loyer)\s*[:\s]*\$?\s*([\d,]+)/i,
    /"rentPrice"\s*:\s*"?([\d,]+)"?/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const num = parseInt(m[1].replace(/[\s,]/g, ""), 10);
      if (num > 100 && num < 50_000) return num;
    }
  }
  return null;
}

/** Fetch a URL and return raw HTML */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

interface ScrapedPrice {
  price: number | null;
  source: string;
  sourceUrl?: string;
  detectedStatus?: "sold" | "rented" | "off_market" | null;
}

const SOLD_PATTERNS = [
  /vendu/i,
  />sold</i,
  /"status"\s*:\s*"sold"/i,
  /this\s+listing\s+is\s+no\s+longer\s+available/i,
];
const RENTED_PATTERNS = [/loué/i, />rented</i, /"status"\s*:\s*"rented"/i];
const OFF_MARKET_PATTERNS = [
  /listing\s+not\s+found/i,
  /cette\s+annonce\s+n['']est\s+plus\s+disponible/i,
  /no\s+longer\s+available/i,
];

function detectStatusFromHtml(
  html: string,
): "sold" | "rented" | "off_market" | null {
  for (const p of SOLD_PATTERNS) {
    if (p.test(html)) return "sold";
  }
  for (const p of RENTED_PATTERNS) {
    if (p.test(html)) return "rented";
  }
  for (const p of OFF_MARKET_PATTERNS) {
    if (p.test(html)) return "off_market";
  }
  return null;
}

/**
 * Try to get the current live price for a listing.
 * Also detects sold/rented/off-market status from Centris HTML.
 * Tier 1: Centris direct scrape → Tier 2: Google Search fallback
 */
async function scrapeLivePrice(
  mlsNumber: string | null,
  originalUrl: string | null,
  city: string,
  listingType: "sale" | "rent",
): Promise<ScrapedPrice> {
  // Tier 1: Direct Centris page scrape
  if (originalUrl?.includes("centris.ca")) {
    const html = await fetchHtml(originalUrl);
    if (html && html.length > 1000) {
      const detectedStatus = detectStatusFromHtml(html);
      const price =
        listingType === "rent"
          ? extractRentPriceFromHtml(html)
          : extractPriceFromHtml(html);
      if (price || detectedStatus) {
        return {
          price,
          source: "centris",
          sourceUrl: originalUrl,
          detectedStatus,
        };
      }
    } else if (html !== null && html.length < 500) {
      return {
        price: null,
        source: "centris",
        sourceUrl: originalUrl,
        detectedStatus: "off_market",
      };
    }
  }

  // Tier 2: Google Search fallback — find listing on any RE site and extract price
  if (mlsNumber) {
    try {
      const { data, sourceUrl } = await enrichViaGoogleSearch(mlsNumber, city);
      if (data) {
        const lookupData = data as PropertyLookupData;
        if (lookupData.listPrice) {
          return {
            price: lookupData.listPrice,
            source: "google",
            sourceUrl,
          };
        }
      }
    } catch {
      // Google search failed, continue
    }
  }

  return { price: null, source: "none" };
}

export interface PriceMonitorResult {
  checked: number;
  priceChanges: number;
  newListings: number;
  delistedListings: number;
  errors: number;
  changes: Array<{
    mlsNumber: string | null;
    address: string;
    listingType: "sale" | "rent";
    oldPrice: number | null;
    newPrice: number | null;
    changeType: string;
    changePercent: number | null;
  }>;
  durationMs: number;
}

/**
 * Run the price monitor for a user's listings.
 * Checks active sale + rental listings against live Centris/Google data.
 */
export async function runPriceMonitor(
  userId: string,
  options: { limit?: number; verbose?: boolean } = {},
): Promise<PriceMonitorResult> {
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);
  const { limit = MAX_PER_RUN, verbose = false } = options;
  const startTime = Date.now();

  const [saleListings, rentalListings] = await Promise.all([
    db.rEProperty.findMany({
      where: { userId, listingStatus: "ACTIVE", mlsNumber: { not: null } },
      select: {
        id: true,
        mlsNumber: true,
        address: true,
        city: true,
        listPrice: true,
        isBrokerListing: true,
      },
      take: limit,
      orderBy: { updatedAt: "asc" },
    }),
    db.rERentalListing.findMany({
      where: { userId, listingStatus: "ACTIVE", mlsNumber: { not: null } },
      select: {
        id: true,
        mlsNumber: true,
        address: true,
        city: true,
        rentPrice: true,
      },
      take: Math.floor(limit / 2),
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  const result: PriceMonitorResult = {
    checked: 0,
    priceChanges: 0,
    newListings: 0,
    delistedListings: 0,
    errors: 0,
    changes: [],
    durationMs: 0,
  };

  // Check sale listings
  for (const listing of saleListings) {
    result.checked++;
    if (verbose) {
      console.log(
        `[price-monitor] [${result.checked}/${saleListings.length + rentalListings.length}] ` +
          `Sale: ${listing.mlsNumber} — ${listing.address}`,
      );
    }

    try {
      const centrisUrl = listing.mlsNumber
        ? `https://www.centris.ca/en/property/${listing.mlsNumber}`
        : null;

      const scraped = await scrapeLivePrice(
        listing.mlsNumber,
        centrisUrl,
        listing.city,
        "sale",
      );

      // Detect status changes (sold, rented, off-market) from Centris HTML
      if (scraped.detectedStatus) {
        const newStatus =
          scraped.detectedStatus === "sold"
            ? ("SOLD" as const)
            : scraped.detectedStatus === "rented"
              ? ("SOLD" as const)
              : scraped.detectedStatus === "off_market"
                ? ("WITHDRAWN" as const)
                : null;

        if (newStatus) {
          await db.rEProperty.update({
            where: { id: listing.id },
            data: {
              listingStatus: newStatus,
              ...(newStatus === "SOLD"
                ? {
                    soldDate: new Date(),
                    soldPrice: scraped.price ?? listing.listPrice,
                  }
                : {}),
            },
          });

          await db.rEPriceChange.create({
            data: {
              userId,
              propertyId: listing.id,
              mlsNumber: listing.mlsNumber,
              address: listing.address,
              oldPrice: listing.listPrice,
              newPrice: scraped.price,
              changeType:
                scraped.detectedStatus === "sold"
                  ? "sold"
                  : scraped.detectedStatus === "rented"
                    ? "rented"
                    : "delisted",
              changePercent: null,
              listingType: "sale",
              source: scraped.source,
              sourceUrl: scraped.sourceUrl,
            },
          });

          try {
            await syncListingToWebsite(userId, {
              address: listing.address,
              city: listing.city,
              state: "",
              zip: "",
              listPrice: scraped.price ?? listing.listPrice ?? 0,
              mlsNumber: listing.mlsNumber,
              listingType: "sale",
              listingStatus: newStatus,
              isBrokerListing: listing.isBrokerListing ?? false,
            });
          } catch {}

          result.delistedListings++;
          result.changes.push({
            mlsNumber: listing.mlsNumber,
            address: listing.address,
            listingType: "sale",
            oldPrice: listing.listPrice,
            newPrice: scraped.price,
            changeType: scraped.detectedStatus,
            changePercent: null,
          });

          if (verbose) {
            console.log(
              `  ⚑ Status changed to ${scraped.detectedStatus}: ${listing.address}`,
            );
          }
          continue;
        }
      }

      if (scraped.price !== null && listing.listPrice !== null) {
        const diff = scraped.price - listing.listPrice;
        if (Math.abs(diff) > 100) {
          const changePercent = (diff / listing.listPrice) * 100;
          const changeType = diff > 0 ? "increase" : "decrease";

          await db.rEPriceChange.create({
            data: {
              userId,
              propertyId: listing.id,
              mlsNumber: listing.mlsNumber,
              address: listing.address,
              oldPrice: listing.listPrice,
              newPrice: scraped.price,
              changeType,
              changePercent: Math.round(changePercent * 100) / 100,
              listingType: "sale",
              source: scraped.source,
              sourceUrl: scraped.sourceUrl,
            },
          });

          await db.rEProperty.update({
            where: { id: listing.id },
            data: { listPrice: scraped.price },
          });

          try {
            await syncListingToWebsite(userId, {
              address: listing.address,
              city: listing.city,
              state: "",
              zip: "",
              listPrice: scraped.price,
              mlsNumber: listing.mlsNumber,
              listingType: "sale",
              listingStatus: "ACTIVE",
              isBrokerListing: listing.isBrokerListing ?? false,
            });
          } catch {}

          result.priceChanges++;
          result.changes.push({
            mlsNumber: listing.mlsNumber,
            address: listing.address,
            listingType: "sale",
            oldPrice: listing.listPrice,
            newPrice: scraped.price,
            changeType,
            changePercent: Math.round(changePercent * 100) / 100,
          });

          if (verbose) {
            const arrow = diff > 0 ? "↑" : "↓";
            console.log(
              `  ${arrow} Price changed: $${listing.listPrice.toLocaleString()} → $${scraped.price.toLocaleString()} (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)`,
            );
          }
        }
      }
    } catch (err) {
      result.errors++;
      if (verbose) console.log(`  Error: ${err}`);
    }

    await sleep(DELAY_MS);
  }

  // Check rental listings
  for (const listing of rentalListings) {
    result.checked++;
    if (verbose) {
      console.log(
        `[price-monitor] [${result.checked}/${saleListings.length + rentalListings.length}] ` +
          `Rent: ${listing.mlsNumber} — ${listing.address}`,
      );
    }

    try {
      const centrisUrl = listing.mlsNumber
        ? `https://www.centris.ca/en/property/${listing.mlsNumber}`
        : null;

      const scraped = await scrapeLivePrice(
        listing.mlsNumber,
        centrisUrl,
        listing.city,
        "rent",
      );

      if (scraped.price !== null && listing.rentPrice !== null) {
        const diff = scraped.price - listing.rentPrice;
        if (Math.abs(diff) > 10) {
          const changePercent = (diff / listing.rentPrice) * 100;
          const changeType = diff > 0 ? "increase" : "decrease";

          await db.rEPriceChange.create({
            data: {
              userId,
              rentalId: listing.id,
              mlsNumber: listing.mlsNumber,
              address: listing.address,
              oldPrice: listing.rentPrice,
              newPrice: scraped.price,
              changeType,
              changePercent: Math.round(changePercent * 100) / 100,
              listingType: "rent",
              source: scraped.source,
              sourceUrl: scraped.sourceUrl,
            },
          });

          await db.rERentalListing.update({
            where: { id: listing.id },
            data: { rentPrice: scraped.price },
          });

          result.priceChanges++;
          result.changes.push({
            mlsNumber: listing.mlsNumber,
            address: listing.address,
            listingType: "rent",
            oldPrice: listing.rentPrice,
            newPrice: scraped.price,
            changeType,
            changePercent: Math.round(changePercent * 100) / 100,
          });

          if (verbose) {
            const arrow = diff > 0 ? "↑" : "↓";
            console.log(
              `  ${arrow} Rent changed: $${listing.rentPrice.toLocaleString()} → $${scraped.price.toLocaleString()} (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)`,
            );
          }
        }
      }
    } catch (err) {
      result.errors++;
      if (verbose) console.log(`  Error: ${err}`);
    }

    await sleep(DELAY_MS);
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Get recent price changes for a user (for dashboard display).
 */
export async function getRecentPriceChanges(
  userId: string,
  limit = 50,
): Promise<
  Array<{
    id: string;
    mlsNumber: string | null;
    address: string;
    oldPrice: number | null;
    newPrice: number | null;
    changeType: string;
    changePercent: number | null;
    listingType: string;
    source: string | null;
    detectedAt: Date;
    syncedToWebsite: boolean;
  }>
> {
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);
  return db.rEPriceChange.findMany({
    where: { userId },
    orderBy: { detectedAt: "desc" },
    take: limit,
    select: {
      id: true,
      mlsNumber: true,
      address: true,
      oldPrice: true,
      newPrice: true,
      changeType: true,
      changePercent: true,
      listingType: true,
      source: true,
      detectedAt: true,
      syncedToWebsite: true,
    },
  });
}
