/**
 * Cron: Sync Centris listings to all real estate broker databases.
 * Fetches from Apify ONCE, then writes the same listings to each broker's DB.
 *
 * Env: APIFY_TOKEN, CENTRIS_REALTOR_DATABASE_URLS (JSON array of connection strings)
 * Add each broker's DATABASE_URL when they onboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { runCentralCentrisSync, type BrokerOverride } from "@/lib/centris-sync";
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
      if (brokerUrl?.trim()) {
        brokerOverrides.push({ databaseUrl: url, centrisBrokerUrl: brokerUrl.trim() });
      }
    }
  }

  if (databaseUrls.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No broker databases configured. Set CENTRIS_REALTOR_DATABASE_URLS or add SERVICE websites with neonDatabaseUrl.",
    });
  }

  try {
    const result = await runCentralCentrisSync(
      databaseUrls,
      25,
      brokerOverrides.length > 0 ? brokerOverrides : undefined
    );
    return NextResponse.json({
      ok: true,
      fetched: result.fetched,
      databases: result.databases.length,
      details: result.databases,
    });
  } catch (err) {
    console.error("[sync-centris]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
