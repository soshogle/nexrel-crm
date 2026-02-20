/**
 * Listing Price & Status Monitor
 *
 * Scrapes Centris / RE/MAX listing pages to detect:
 *   - Price changes (increase, decrease)
 *   - Status changes (sold, rented, off-market, expired)
 *   - Listing removal (404 / page gone)
 *
 * Alternates between Centris and RE/MAX to distribute load.
 * Stores price history in a JSON column and updates the DB.
 */

import pg from "pg";
import type { EnrichedData } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface MonitorResult {
  mlsNumber: string;
  listingId: number;
  action: "price_change" | "status_change" | "removed" | "no_change" | "error";
  oldPrice?: string;
  newPrice?: string;
  oldStatus?: string;
  newStatus?: string;
  details?: string;
}

export interface MonitorOptions {
  limit?: number;
  delayMs?: number;
  verbose?: boolean;
  /** Only check listings not verified in the last N hours */
  staleBeyondHours?: number;
}

interface ListingToMonitor {
  id: number;
  mlsNumber: string;
  title: string;
  originalUrl: string | null;
  price: string;
  status: string;
  listingType: string;
  updatedAt: Date;
}

// ─── Price extraction from Centris pages ───

function extractPriceFromHtml(html: string): number | null {
  // Strategy 1: JSON price data (most reliable)
  const jsonPatterns = [
    /"price"\s*:\s*"?([\d,.]+)"?/i,
    /"askingPrice"\s*:\s*"?([\d,.]+)"?/i,
    /"currentPrice"\s*:\s*"?([\d,.]+)"?/i,
  ];
  for (const p of jsonPatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const price = parseFloat(m[1].replace(/[,\s]/g, ""));
      if (price >= 500 && price < 1_000_000_000) return price;
    }
  }

  // Strategy 2: Find all dollar amounts and pick the most prominent one
  // Listing price is typically the first large amount near the top of the page
  const allPrices: number[] = [];
  const dollarPattern = /\$([\d,]+(?:\.\d{2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = dollarPattern.exec(html)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, ""));
    if (val >= 500 && val < 1_000_000_000) {
      allPrices.push(val);
    }
  }

  if (allPrices.length === 0) return null;

  // The listing price is usually the first substantial amount,
  // and it appears more often than other amounts (repeated in meta tags, JSON, etc.)
  const counts = new Map<number, number>();
  allPrices.forEach((p) => counts.set(p, (counts.get(p) || 0) + 1));

  // Pick the most frequently occurring price (likely the listing price)
  let bestPrice = allPrices[0];
  let bestCount = 0;
  for (const [price, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestPrice = price;
    }
  }

  return bestPrice;
}

// ─── Status detection from page HTML ───

type DetectedStatus = "active" | "sold" | "rented" | "expired" | "removed" | "unknown";

// These patterns must be specific to avoid false positives from street names, etc.
const SOLD_PATTERNS = [
  />\s*vendu\s*</i,                        // <span>Vendu</span>
  /class="[^"]*sold[^"]*"/i,               // CSS class containing "sold"
  />\s*sold\s*</i,                          // <span>Sold</span>
  /"status"\s*:\s*"sold"/i,                 // JSON status
  /sold\s+(?:for|at)\s+\$/i,               // "Sold for $X"
  /cette\s+propri[ée]t[ée]\s+a\s+[ée]t[ée]\s+vendue/i,
  /property\s+has\s+been\s+sold/i,
];

const RENTED_PATTERNS = [
  />\s*lou[ée]\s*</i,                       // <span>Loué</span>
  /class="[^"]*rented[^"]*"/i,             // CSS class containing "rented"
  />\s*rented\s*</i,                        // <span>Rented</span>
  /"status"\s*:\s*"rented"/i,               // JSON status
  /no\s+longer\s+available\s+for\s+rent/i,
  /property\s+has\s+been\s+rented/i,
];

const EXPIRED_PATTERNS = [
  /listing\s+(?:has\s+)?expired/i,
  /annonce\s+expir[ée]e/i,
  /this\s+listing\s+is\s+no\s+longer\s+available/i,
  /cette\s+annonce\s+n['']est\s+plus\s+disponible/i,
  /inscription\s+n['']est\s+plus\s+disponible/i,
];

function detectStatusFromHtml(html: string, listingType: string): DetectedStatus {
  // Check rented patterns (only meaningful for rental listings)
  if (listingType === "rent") {
    for (const p of RENTED_PATTERNS) {
      if (p.test(html)) return "rented";
    }
  }

  for (const p of SOLD_PATTERNS) {
    if (p.test(html)) return "sold";
  }

  // Check rented for sale listings too, but only the most specific patterns
  if (listingType !== "rent") {
    if (/"status"\s*:\s*"rented"/i.test(html)) return "rented";
  }

  for (const p of EXPIRED_PATTERNS) {
    if (p.test(html)) return "expired";
  }

  // If we can find an active price + property content, it's still active
  if (
    (html.includes("Features") || html.includes("Description") || html.includes("Bedrooms")) &&
    /\$[\d,]+/.test(html)
  ) {
    return "active";
  }

  return "unknown";
}

function parseSoldPrice(html: string): number | null {
  const patterns = [
    /vendu\s+pour\s+([\d\s]+)\s*\$?/i,
    /sold\s+(?:for|at)\s+\$?([\d,]+)/i,
    /"soldPrice"\s*:\s*([\d]+)/i,
    /sold\s+price[:\s]+\$?([\d,]+)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const num = parseInt(m[1].replace(/[\s,]/g, ""), 10);
      if (num > 1000 && num < 100_000_000) return num;
    }
  }
  return null;
}

// ─── Database operations ───

async function fetchListingsToMonitor(
  pool: pg.Pool,
  limit: number,
  staleBeyondHours: number
): Promise<ListingToMonitor[]> {
  // Use PostgreSQL's NOW() to avoid JS/DB clock drift
  const result = await pool.query(
    `SELECT id, mls_number AS "mlsNumber", title, original_url AS "originalUrl",
            price, status, listing_type AS "listingType", updated_at AS "updatedAt"
     FROM properties
     WHERE status = 'active'
       AND original_url IS NOT NULL
       AND updated_at < (NOW() - INTERVAL '1 hour' * $1)
     ORDER BY updated_at ASC
     LIMIT $2`,
    [staleBeyondHours, limit]
  );
  return result.rows;
}

async function updateListingPrice(
  pool: pg.Pool,
  listingId: number,
  newPrice: string,
  oldPrice: string
): Promise<void> {
  const changeNote = `\n[Price change ${new Date().toISOString().slice(0, 10)}: $${oldPrice} → $${newPrice}]`;
  await pool.query(
    `UPDATE properties
     SET price = $1::numeric,
         updated_at = NOW(),
         addendum = COALESCE(addendum, '') || $2
     WHERE id = $3`,
    [newPrice, changeNote, listingId]
  );
}

async function updateListingStatus(
  pool: pg.Pool,
  listingId: number,
  newStatus: string,
  soldPrice?: number | null
): Promise<void> {
  if (soldPrice != null && soldPrice > 0) {
    await pool.query(
      `UPDATE properties SET status = $1, price = $2, updated_at = NOW() WHERE id = $3`,
      [newStatus, String(soldPrice), listingId]
    );
  } else {
    await pool.query(
      `UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, listingId]
    );
  }
}

async function touchListing(pool: pg.Pool, listingId: number): Promise<void> {
  await pool.query(`UPDATE properties SET updated_at = NOW() WHERE id = $1`, [listingId]);
}

// ─── Main monitor ───

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrape a Centris listing page and return the raw HTML + detected price/status.
 */
async function checkListingPage(url: string): Promise<{
  html: string;
  price: number | null;
  statusCode: number;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (res.status === 404 || res.status === 410) {
      return { html: "", price: null, statusCode: res.status };
    }

    const html = await res.text();
    const price = extractPriceFromHtml(html);
    return { html, price, statusCode: res.status };
  } catch {
    return null;
  }
}

/**
 * Monitor all active listings for price changes and status updates.
 *
 * @param databaseUrl - PostgreSQL connection string
 * @param opts - Monitor options
 */
export async function monitorListings(
  databaseUrl: string,
  opts: MonitorOptions = {}
): Promise<{
  results: MonitorResult[];
  summary: {
    total: number;
    priceChanges: number;
    statusChanges: number;
    removed: number;
    noChange: number;
    errors: number;
    durationMs: number;
  };
}> {
  const {
    limit = 100,
    delayMs = 1500,
    verbose = false,
    staleBeyondHours = 12,
  } = opts;

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });
  const batchStart = Date.now();
  const results: MonitorResult[] = [];

  let priceChanges = 0;
  let statusChanges = 0;
  let removed = 0;
  let noChange = 0;
  let errors = 0;

  try {
    const listings = await fetchListingsToMonitor(pool, limit, staleBeyondHours);
    if (verbose) console.log(`Found ${listings.length} listings to monitor\n`);

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      if (verbose) {
        console.log(`[${i + 1}/${listings.length}] ${listing.mlsNumber}: $${listing.price} | ${listing.title.slice(0, 50)}...`);
      }

      if (!listing.originalUrl) {
        await touchListing(pool, listing.id);
        continue;
      }

      const pageResult = await checkListingPage(listing.originalUrl);

      if (!pageResult) {
        if (verbose) console.log("  ⚠️  Network error — skipping");
        results.push({
          mlsNumber: listing.mlsNumber,
          listingId: listing.id,
          action: "error",
          details: "Network error fetching page",
        });
        errors++;
        if (delayMs > 0) await sleep(delayMs);
        continue;
      }

      // --- Page gone (404/410) → listing removed ---
      if (pageResult.statusCode === 404 || pageResult.statusCode === 410) {
        const newStatus = listing.listingType === "rent" ? "rented" : "sold";
        await updateListingStatus(pool, listing.id, newStatus);
        if (verbose) console.log(`  🔴 REMOVED → marked as ${newStatus}`);
        results.push({
          mlsNumber: listing.mlsNumber,
          listingId: listing.id,
          action: "removed",
          oldStatus: "active",
          newStatus,
          details: `Page returned ${pageResult.statusCode}`,
        });
        removed++;
        if (delayMs > 0) await sleep(delayMs);
        continue;
      }

      // --- Check status from page content ---
      const detectedStatus = detectStatusFromHtml(pageResult.html, listing.listingType);

      if (detectedStatus === "sold" || detectedStatus === "rented" || detectedStatus === "expired") {
        const soldPrice = detectedStatus === "sold" ? parseSoldPrice(pageResult.html) : null;
        await updateListingStatus(pool, listing.id, detectedStatus, soldPrice);
        if (verbose) {
          const priceNote = soldPrice ? ` (sold for $${soldPrice.toLocaleString()})` : "";
          console.log(`  🔴 STATUS: active → ${detectedStatus}${priceNote}`);
        }
        results.push({
          mlsNumber: listing.mlsNumber,
          listingId: listing.id,
          action: "status_change",
          oldStatus: "active",
          newStatus: detectedStatus,
          details: soldPrice ? `Sold for $${soldPrice.toLocaleString()}` : undefined,
        });
        statusChanges++;
        if (delayMs > 0) await sleep(delayMs);
        continue;
      }

      // --- Check price change ---
      if (pageResult.price != null) {
        const currentPrice = parseFloat(listing.price);
        const pagePriceNum = pageResult.price;
        const pctAbs = Math.abs((pagePriceNum - currentPrice) / currentPrice * 100);

        // Only register a change if it's > 0.5% and < 80%
        // (>80% drop is almost certainly a scraping error — e.g. matching a deposit amount)
        if (pctAbs > 0.5 && pctAbs < 80) {
          const direction = pagePriceNum > currentPrice ? "⬆️" : "⬇️";
          const pctChange = ((pagePriceNum - currentPrice) / currentPrice * 100).toFixed(1);
          const newPriceStr = String(pagePriceNum);

          await updateListingPrice(pool, listing.id, newPriceStr, listing.price);

          if (verbose) {
            console.log(`  ${direction} PRICE: $${currentPrice.toLocaleString()} → $${pagePriceNum.toLocaleString()} (${pctChange}%)`);
          }
          results.push({
            mlsNumber: listing.mlsNumber,
            listingId: listing.id,
            action: "price_change",
            oldPrice: listing.price,
            newPrice: newPriceStr,
            details: `${pctChange}% change`,
          });
          priceChanges++;
          if (delayMs > 0) await sleep(delayMs);
          continue;
        } else if (pctAbs >= 80 && verbose) {
          console.log(`  ⚠️  Suspicious price: $${currentPrice.toLocaleString()} → $${pagePriceNum.toLocaleString()} (${pctAbs.toFixed(0)}% change) — skipping`);
        }
      }

      // --- No change detected ---
      await touchListing(pool, listing.id);
      if (verbose) console.log("  ✅ No change");
      results.push({
        mlsNumber: listing.mlsNumber,
        listingId: listing.id,
        action: "no_change",
      });
      noChange++;

      if (delayMs > 0 && i < listings.length - 1) await sleep(delayMs);
    }

    return {
      results,
      summary: {
        total: listings.length,
        priceChanges,
        statusChanges,
        removed,
        noChange,
        errors,
        durationMs: Date.now() - batchStart,
      },
    };
  } finally {
    await pool.end();
  }
}
