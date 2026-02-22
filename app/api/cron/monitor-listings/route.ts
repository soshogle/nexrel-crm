/**
 * Cron: Monitor active listings for price changes and sold/rented status.
 * Runs on all SERVICE broker databases automatically.
 *
 * Checks each active listing's source page (Centris/RE/MAX) to detect:
 *   - Sold / Rented / Off-market status
 *   - Price changes
 * Updates the broker DB when changes are found.
 *
 * Schedule: Every 12 hours via Vercel Cron
 * Max duration: 300s (checks ~200 listings per run)
 */

import { NextRequest, NextResponse } from "next/server";
import { createDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { monitorListings } from "@/lib/listing-enrichment/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getCrmDb(createDalContext("cron"));
  const websites = await db.website.findMany({
    where: {
      templateType: "SERVICE",
      status: "READY",
      neonDatabaseUrl: { not: null },
    },
    select: { id: true, name: true, neonDatabaseUrl: true },
  });

  const dbUrls = websites.filter((w) => w.neonDatabaseUrl?.startsWith("postgresql://"));

  if (dbUrls.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No SERVICE websites with database URLs found.",
    });
  }

  const allResults: {
    website: string;
    summary: {
      total: number;
      priceChanges: number;
      statusChanges: number;
      removed: number;
      noChange: number;
      errors: number;
      durationMs: number;
    };
    changes: { mlsNumber: string; action: string; details?: string }[];
  }[] = [];

  for (const site of dbUrls) {
    try {
      const { results, summary } = await monitorListings(site.neonDatabaseUrl!, {
        limit: 200,
        delayMs: 1200,
        verbose: false,
        staleBeyondHours: 12,
      });

      const changes = results
        .filter((r) => r.action !== "no_change")
        .map((r) => ({
          mlsNumber: r.mlsNumber,
          action: r.action,
          details:
            r.action === "price_change"
              ? `$${parseFloat(r.oldPrice!).toLocaleString()} → $${parseFloat(r.newPrice!).toLocaleString()}`
              : r.action === "status_change" || r.action === "removed"
                ? `${r.oldStatus} → ${r.newStatus}`
                : r.details,
        }));

      allResults.push({
        website: site.name || site.id,
        summary,
        changes,
      });

      console.log(
        `[monitor-listings] ${site.name}: checked ${summary.total}, ` +
        `changes: ${summary.priceChanges} price, ${summary.statusChanges} status, ${summary.removed} removed`
      );
    } catch (err) {
      console.error(`[monitor-listings] ${site.name || site.id} failed:`, err);
      allResults.push({
        website: site.name || site.id,
        summary: {
          total: 0,
          priceChanges: 0,
          statusChanges: 0,
          removed: 0,
          noChange: 0,
          errors: 1,
          durationMs: 0,
        },
        changes: [{ mlsNumber: "N/A", action: "error", details: String(err).slice(0, 200) }],
      });
    }
  }

  const totalChanges = allResults.reduce(
    (sum, r) => sum + r.summary.priceChanges + r.summary.statusChanges + r.summary.removed,
    0
  );

  return NextResponse.json({
    ok: true,
    websitesChecked: dbUrls.length,
    totalChanges,
    results: allResults,
  });
}
