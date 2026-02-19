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
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (databaseUrls.length === 0) {
    const websites = await prisma.website.findMany({
      where: {
        templateType: "SERVICE",
        status: "READY",
        neonDatabaseUrl: { not: null },
      },
      select: { neonDatabaseUrl: true, agencyConfig: true },
    });
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
  const websites = await prisma.website.findMany({
    where: {
      templateType: "SERVICE",
      status: "READY",
      neonDatabaseUrl: { not: null },
    },
    select: { neonDatabaseUrl: true, agencyConfig: true },
  });
  for (const w of websites) {
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

    return NextResponse.json({
      ok: true,
      centris: { fetched: result.fetched, databases: result.databases.length, details: result.databases },
      realtor: realtorResults,
    });
  } catch (err) {
    console.error("[sync-centris]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
