/**
 * Listing verification — fetch property detail pages from Realtor.ca / Centris.ca
 * to confirm if listings that disappeared from scrape results are sold, rented, or off-market.
 * Only updates DB when we get a clear status from the source.
 */
import pg from "pg";

const FETCH_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 15000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type VerifiedStatus = "sold" | "rented" | "not_found" | "unknown";

export type VerificationResult = {
  mls_number: string;
  listing_type: "sale" | "rent";
  status: VerifiedStatus;
  updated: boolean;
};

/** Parse sold price from Centris/Realtor sold listing page HTML. Returns null if not found. */
function parseSoldPrice(html: string, source: "realtor" | "centris"): number | null {
  // Centris FR: "Vendu pour 450 000 $", "Vendu pour 450 000$"
  // Centris EN: "Sold for $450,000", "Sold at $450,000"
  // Realtor: "Sold for $450,000", "Sold at $450,000", "Sold over asking"
  const patterns = [
    /vendu\s+pour\s+([\d\s]+)\s*\$?/i,
    /sold\s+(?:for|at)\s+\$?([\d,]+)/i,
    /"soldPrice"\s*:\s*([\d]+)/i,
    /"salePrice"\s*:\s*([\d]+)/i,
    /sold\s+price[:\s]+\$?([\d,]+)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) {
      const num = parseInt(m[1].replace(/[\s,]/g, ""), 10);
      if (num > 1000 && num < 100_000_000) return num;
    }
  }
  return null;
}

/** Realtor.ca status indicators in page HTML */
const REALTOR_SOLD_PATTERNS = [
  /sold\s+over\s+asking/i,
  /sold\s+under\s+asking/i,
  /sold\s+at\s+asking/i,
  /"status"\s*:\s*"sold"/i,
  /"Status"\s*:\s*"Sold"/i,
  />sold</i,
  /listing\s+no\s+longer\s+available/i,
  /this\s+listing\s+has\s+been\s+removed/i,
  /listing\s+not\s+found/i,
];

const REALTOR_RENTED_PATTERNS = [
  /"status"\s*:\s*"rented"/i,
  />rented</i,
  /no\s+longer\s+available\s+for\s+rent/i,
];

/** Centris.ca status indicators (FR + EN) */
const CENTRIS_SOLD_PATTERNS = [
  /vendu/i,
  />sold</i,
  /"status"\s*:\s*"sold"/i,
  /cette\s+annonce\s+n['']est\s+plus\s+disponible/i,
  /this\s+listing\s+is\s+no\s+longer\s+available/i,
];

const CENTRIS_RENTED_PATTERNS = [
  /loué/i,
  />rented</i,
  /"status"\s*:\s*"rented"/i,
];

function parseRealtorStatus(html: string): VerifiedStatus {
  for (const p of REALTOR_RENTED_PATTERNS) {
    if (p.test(html)) return "rented";
  }
  for (const p of REALTOR_SOLD_PATTERNS) {
    if (p.test(html)) return "sold";
  }
  return "unknown";
}

function parseCentrisStatus(html: string): VerifiedStatus {
  for (const p of CENTRIS_RENTED_PATTERNS) {
    if (p.test(html)) return "rented";
  }
  for (const p of CENTRIS_SOLD_PATTERNS) {
    if (p.test(html)) return "sold";
  }
  return "unknown";
}

async function fetchWithRetry(
  url: string,
  retries = 2
): Promise<{ html: string; statusCode: number } | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-CA,en;q=0.9,fr;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const html = await res.text();
      if (res.status === 404) {
        return { html: "", statusCode: 404 };
      }
      return { html, statusCode: res.status };
    } catch (err) {
      if (i === retries) return null;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  return null;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Get listings from DB that match slug prefix and are NOT in activeMls (candidates for verification).
 */
async function getListingsToVerify(
  databaseUrl: string,
  slugPrefix: string,
  activeMls: string[]
): Promise<{ mls_number: string; original_url: string; listing_type: string }[]> {
  if (activeMls.length === 0) return [];
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const r = await client.query(
      `SELECT mls_number, original_url, listing_type FROM properties
       WHERE slug LIKE $1 AND mls_number != ALL($2::text[]) AND status = 'active'
       AND original_url IS NOT NULL AND original_url != ''`,
      [slugPrefix, activeMls]
    );
    return r.rows.map((row) => ({
      mls_number: row.mls_number,
      original_url: row.original_url,
      listing_type: row.listing_type || "sale",
    }));
  } finally {
    await client.end();
  }
}

/**
 * Update listing status in DB. When sold, optionally update price to sold price.
 */
async function updateListingStatus(
  databaseUrl: string,
  mlsNumber: string,
  newStatus: "sold" | "rented",
  soldPrice?: number | null
): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    if (newStatus === "sold" && soldPrice != null && soldPrice > 0) {
      await client.query(
        `UPDATE properties SET status = $1, price = $2 WHERE mls_number = $3`,
        [newStatus, String(soldPrice), mlsNumber]
      );
    } else {
      await client.query(
        `UPDATE properties SET status = $1 WHERE mls_number = $2`,
        [newStatus, mlsNumber]
      );
    }
    return true;
  } catch (err) {
    console.warn("[listing-verification] updateListingStatus failed:", mlsNumber, err);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Verify listings that disappeared from scrape and update DB when status is confirmed.
 * @param databaseUrl - Broker PostgreSQL connection string
 * @param source - "realtor" or "centris"
 * @param activeMls - MLS numbers that ARE in the current scrape (these are still active)
 */
export async function verifyAndUpdateListings(
  databaseUrl: string,
  source: "realtor" | "centris",
  activeMls: string[]
): Promise<{ verified: number; updated: number; unknown: number }> {
  const slugPrefix = source === "realtor" ? "realtor-%" : "centris-%";
  const toVerify = await getListingsToVerify(databaseUrl, slugPrefix, activeMls);
  if (toVerify.length === 0) {
    return { verified: 0, updated: 0, unknown: 0 };
  }

  const parseStatus = source === "realtor" ? parseRealtorStatus : parseCentrisStatus;
  let updated = 0;
  let unknown = 0;

  for (const listing of toVerify) {
    await delay(FETCH_DELAY_MS);
    const result = await fetchWithRetry(listing.original_url);
    if (!result) {
      unknown++;
      continue;
    }

    let status: VerifiedStatus;
    if (result.statusCode === 404) {
      status = listing.listing_type === "rent" ? "rented" : "sold";
    } else {
      status = parseStatus(result.html);
    }

    if (status === "sold" || status === "rented") {
      const soldPrice = status === "sold" ? parseSoldPrice(result.html, source) : null;
      const ok = await updateListingStatus(databaseUrl, listing.mls_number, status, soldPrice);
      if (ok) updated++;
    } else {
      unknown++;
    }
  }

  return {
    verified: toVerify.length,
    updated,
    unknown,
  };
}
