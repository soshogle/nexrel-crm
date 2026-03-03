/**
 * Cron: Sync Centris + Realtor.ca listings to all real estate broker databases.
 * Centris: Fetches from Apify ONCE, writes same listings to each broker's DB.
 * Realtor: For brokers with realtorBrokerUrl, fetches their agent page and imports to their DB.
 *
 * Env: APIFY_TOKEN, CENTRIS_REALTOR_DATABASE_URLS (JSON array of connection strings)
 */

import { NextRequest, NextResponse } from "next/server";
import { runCentralCentrisSync, type BrokerOverride } from "@/lib/centris-sync";
import { runRealtorSync } from "@/lib/realtor-sync";
import { getCrmDb } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";
import { prisma } from "@/lib/db";
import { apiErrors } from '@/lib/api-error';
import { runPriceMonitor, type PriceMonitorResult } from "@/lib/listing-enrichment/price-monitor";
import { enrichCrmListings, resyncEnrichedToWebsite } from "@/lib/listing-enrichment/enrich-crm-listings";
import { backfillPropertyCoordinates } from "@/lib/real-estate/geo-comps";
import { syncStatusChangesToWebsite, flagBrokerListingsFromWebsite } from "@/lib/website-builder/listings-service";
import { importApifyListingsToCrm } from "@/lib/real-estate/apify-crm-import";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiErrors.unauthorized();
  }

  let databaseUrls: string[] = [];
  let brokerOverrides: BrokerOverride[] = [];

  // 1. From env: CENTRIS_REALTOR_DATABASE_URLS (JSON array)
  const envUrls = process.env.CENTRIS_REALTOR_DATABASE_URLS;
  if (envUrls) {
    try {
      const parsed = JSON.parse(envUrls) as string[];
      if (Array.isArray(parsed)) {
        databaseUrls = parsed.filter((u) => typeof u === "string" && u.startsWith("postgresql://"));
      }
    } catch (e) {
      console.error("[sync-centris] Invalid CENTRIS_REALTOR_DATABASE_URLS:", e);
    }
  }

  // 2. Fallback: Website table (SERVICE template sites with neonDatabaseUrl)
  const ctx = createDalContext('bootstrap');
  const db = getCrmDb(ctx);
  if (databaseUrls.length === 0) {
    const websites: any[] = await db.website.findMany({
      where: {
        templateType: "SERVICE",
        status: "READY",
        neonDatabaseUrl: { not: null },
      },
      select: { neonDatabaseUrl: true, agencyConfig: true },
    } as any);
    databaseUrls = websites
      .map((w) => w.neonDatabaseUrl)
      .filter((u): u is string => !!u && u.startsWith("postgresql://"));

    for (const w of websites) {
      const url = w.neonDatabaseUrl;
      if (!url?.startsWith("postgresql://")) continue;
      const ac = w.agencyConfig as Record<string, unknown> | null;
      const brokerUrl = ac?.centrisBrokerUrl as string | undefined;
      const brokerSoldUrl = ac?.centrisBrokerSoldUrl as string | undefined;
      if (brokerUrl?.trim() || brokerSoldUrl?.trim()) {
        brokerOverrides.push({
          databaseUrl: url,
          centrisBrokerUrl: brokerUrl?.trim(),
          centrisBrokerSoldUrl: brokerSoldUrl?.trim(),
        });
      }
    }
  }

  if (databaseUrls.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No broker databases configured. Set CENTRIS_REALTOR_DATABASE_URLS or add SERVICE websites with neonDatabaseUrl.",
    });
  }

  // Realtor.ca sync for brokers with realtorBrokerUrl
  const realtorOverrides: { databaseUrl: string; realtorBrokerUrl: string }[] = [];
  const websitesRealtor: any[] = await db.website.findMany({
    where: {
      templateType: "SERVICE",
      status: "READY",
      neonDatabaseUrl: { not: null },
    },
    select: { neonDatabaseUrl: true, agencyConfig: true },
  } as any);
  for (const w of websitesRealtor) {
    const url = w.neonDatabaseUrl;
    if (!url?.startsWith("postgresql://")) continue;
    const ac = w.agencyConfig as Record<string, unknown> | null;
    const realtorUrl = ac?.realtorBrokerUrl as string | undefined;
    if (realtorUrl?.trim()) {
      realtorOverrides.push({ databaseUrl: url, realtorBrokerUrl: realtorUrl.trim() });
    }
  }

  try {
    const result = await runCentralCentrisSync(
      databaseUrls,
      25,
      brokerOverrides.length > 0 ? brokerOverrides : undefined
    );

    const realtorResults: { urlPreview: string; fetched: number; imported: number; error?: string }[] = [];
    for (const { databaseUrl, realtorBrokerUrl } of realtorOverrides) {
      try {
        const r = await runRealtorSync(realtorBrokerUrl, databaseUrl);
        realtorResults.push({
          urlPreview: databaseUrl.replace(/:[^:@]+@/, ":****@").slice(0, 50) + "...",
          fetched: r.fetched,
          imported: r.imported,
          error: r.error,
        });
      } catch (err) {
        console.warn("[sync-realtor] Failed:", realtorBrokerUrl, err);
        realtorResults.push({
          urlPreview: databaseUrl.replace(/:[^:@]+@/, ":****@").slice(0, 50) + "...",
          fetched: 0,
          imported: 0,
          error: String(err),
        });
      }
    }

    // Import new Centris listings into CRM REProperty (incremental — skip existing MLS numbers)
    const crmImportResults: Array<{ userId: string; imported: number; skipped: number }> = [];
    try {
      const reUsersImport: any[] = await db.user.findMany({
        where: { industry: 'REAL_ESTATE' },
        select: { id: true },
        take: 10,
      });
      for (const u of reUsersImport) {
        try {
          const ir = await importApifyListingsToCrm(u.id, databaseUrls[0]);
          crmImportResults.push({ userId: u.id, imported: ir.imported, skipped: ir.skipped });
        } catch (err) {
          console.warn("[crm-import] Failed for user", u.id, err);
        }
      }
    } catch (err) {
      console.warn("[crm-import] User lookup failed:", err);
    }

    // Run price monitor for each broker user after sync
    const priceMonitorResults: Array<{ userId: string; result: PriceMonitorResult }> = [];
    try {
      const brokerUsers: any[] = await db.user.findMany({
        where: { industry: 'real_estate' },
        select: { id: true },
        take: 10,
      });
      for (const u of brokerUsers) {
        try {
          const pmResult = await runPriceMonitor(u.id, { limit: 30, verbose: true });
          if (pmResult.priceChanges > 0) {
            priceMonitorResults.push({ userId: u.id, result: pmResult });
          }
        } catch (err) {
          console.warn("[price-monitor] Failed for user", u.id, err);
        }
      }
    } catch (err) {
      console.warn("[price-monitor] User lookup failed:", err);
    }

    // Run CRM listing enrichment (scrape Centris/RE/MAX for full details)
    const enrichmentResults: Array<{ userId: string; enriched: number; failed: number }> = [];
    try {
      const reUsers: any[] = await db.user.findMany({
        where: { industry: 'real_estate' },
        select: { id: true },
        take: 10,
      });
      for (const u of reUsers) {
        try {
          const er = await enrichCrmListings(u.id, { limit: 15, verbose: true });
          enrichmentResults.push({ userId: u.id, enriched: er.enriched, failed: er.failed });
        } catch (err) {
          console.warn("[enrich-crm] Failed for user", u.id, err);
        }
      }
    } catch (err) {
      console.warn("[enrich-crm] User lookup failed:", err);
    }

    // Re-sync enriched CRM listings to website (repairs Apify overwrites)
    const resyncResults: Array<{ userId: string; synced: number; failed: number }> = [];
    try {
      const reUsersResync: any[] = await db.user.findMany({
        where: { industry: 'real_estate' },
        select: { id: true },
        take: 10,
      });
      for (const u of reUsersResync) {
        try {
          const rr = await resyncEnrichedToWebsite(u.id, { limit: 200, verbose: true });
          if (rr.synced > 0) {
            resyncResults.push({ userId: u.id, synced: rr.synced, failed: rr.failed });
          }
        } catch (err) {
          console.warn("[resync] Failed for user", u.id, err);
        }
      }
    } catch (err) {
      console.warn("[resync] User lookup failed:", err);
    }

    // Backfill lat/lng coordinates for properties missing them
    const coordBackfillResults: Array<{ userId: string; updated: number }> = [];
    try {
      const reUsers2: any[] = await db.user.findMany({
        where: { industry: 'real_estate' },
        select: { id: true },
        take: 10,
      });
      for (const u of reUsers2) {
        try {
          const bf = await backfillPropertyCoordinates(u.id, { limit: 30, verbose: true });
          if (bf.updated > 0) {
            coordBackfillResults.push({ userId: u.id, updated: bf.updated });
          }
        } catch (err) {
          console.warn("[backfill-coords] Failed for user", u.id, err);
        }
      }
    } catch (err) {
      console.warn("[backfill-coords] User lookup failed:", err);
    }

    // Flag broker listings: cross-reference website featured listings with CRM properties
    const brokerFlagResults: Array<{ userId: string; flagged: number }> = [];
    try {
      const reUsersFlag: any[] = await db.user.findMany({
        where: { industry: 'real_estate' },
        select: { id: true },
        take: 10,
      });
      for (const u of reUsersFlag) {
        try {
          const fr = await flagBrokerListingsFromWebsite(u.id);
          if (fr.flagged > 0) {
            brokerFlagResults.push({ userId: u.id, flagged: fr.flagged });
          }
        } catch (err) {
          console.warn("[broker-flag] Failed for user", u.id, err);
        }
      }
    } catch (err) {
      console.warn("[broker-flag] User lookup failed:", err);
    }

    // Bulk sync sold/rented status to website (catch-all for any missed per-update syncs)
    const statusSyncResults: Array<{ userId: string; sold: number; rented: number }> = [];
    try {
      const reUsersSync: any[] = await db.user.findMany({
        where: { industry: 'real_estate' },
        select: { id: true },
        take: 10,
      });
      for (const u of reUsersSync) {
        try {
          const sr = await syncStatusChangesToWebsite(u.id);
          if (sr.soldUpdated > 0 || sr.rentedUpdated > 0) {
            statusSyncResults.push({ userId: u.id, sold: sr.soldUpdated, rented: sr.rentedUpdated });
          }
        } catch (err) {
          console.warn("[status-sync] Failed for user", u.id, err);
        }
      }
    } catch (err) {
      console.warn("[status-sync] User lookup failed:", err);
    }

    return NextResponse.json({
      ok: true,
      centris: { fetched: result.fetched, databases: result.databases.length, details: result.databases },
      crmImport: {
        usersProcessed: crmImportResults.length,
        totalImported: crmImportResults.reduce((s, r) => s + r.imported, 0),
        totalSkipped: crmImportResults.reduce((s, r) => s + r.skipped, 0),
        details: crmImportResults,
      },
      realtor: realtorResults,
      priceMonitor: {
        usersChecked: priceMonitorResults.length,
        totalChanges: priceMonitorResults.reduce((s, r) => s + r.result.priceChanges, 0),
        details: priceMonitorResults.map((r) => ({
          userId: r.userId,
          checked: r.result.checked,
          changes: r.result.priceChanges,
        })),
      },
      enrichment: {
        usersProcessed: enrichmentResults.length,
        totalEnriched: enrichmentResults.reduce((s, r) => s + r.enriched, 0),
        details: enrichmentResults,
      },
      resync: {
        usersProcessed: resyncResults.length,
        totalSynced: resyncResults.reduce((s, r) => s + r.synced, 0),
        details: resyncResults,
      },
      coordBackfill: {
        usersProcessed: coordBackfillResults.length,
        totalUpdated: coordBackfillResults.reduce((s, r) => s + r.updated, 0),
        details: coordBackfillResults,
      },
      statusSync: {
        usersProcessed: statusSyncResults.length,
        totalSold: statusSyncResults.reduce((s, r) => s + r.sold, 0),
        totalRented: statusSyncResults.reduce((s, r) => s + r.rented, 0),
        details: statusSyncResults,
      },
      brokerFlags: {
        usersProcessed: brokerFlagResults.length,
        totalFlagged: brokerFlagResults.reduce((s, r) => s + r.flagged, 0),
        details: brokerFlagResults,
      },
    });
  } catch (err) {
    console.error("[sync-centris]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
