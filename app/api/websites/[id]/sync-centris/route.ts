/**
 * POST /api/websites/[id]/sync-centris
 * Triggers Centris sync (fetches from Apify, writes to all SERVICE broker DBs).
 * Requires session auth — user must own the website.
 * The sync runs for ALL broker databases (not just this website).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runCentralCentrisSync, type BrokerOverride } from '@/lib/centris-sync';
import { runRealtorSync } from '@/lib/realtor-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, templateType: true, neonDatabaseUrl: true, agencyConfig: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    if (website.templateType !== 'SERVICE') {
      return NextResponse.json(
        { error: 'Centris sync is only for real estate service websites' },
        { status: 400 }
      );
    }

    let databaseUrls: string[] = [];
    let brokerOverrides: BrokerOverride[] = [];

    // 1. From env: CENTRIS_REALTOR_DATABASE_URLS
    const envUrls = process.env.CENTRIS_REALTOR_DATABASE_URLS;
    if (envUrls) {
      try {
        const parsed = JSON.parse(envUrls) as string[];
        if (Array.isArray(parsed)) {
          databaseUrls = parsed.filter(
            (u) => typeof u === 'string' && u.startsWith('postgresql://')
          );
        }
      } catch (e) {
        console.error('[sync-centris] Invalid CENTRIS_REALTOR_DATABASE_URLS:', e);
      }
    }

    // 2. Fallback: Website table (SERVICE with neonDatabaseUrl)
    if (databaseUrls.length === 0) {
      const websites = await prisma.website.findMany({
        where: {
          templateType: 'SERVICE',
          status: 'READY',
          neonDatabaseUrl: { not: null },
        },
        select: { neonDatabaseUrl: true, agencyConfig: true },
      });
      databaseUrls = websites
        .map((w) => w.neonDatabaseUrl)
        .filter((u): u is string => !!u && u.startsWith('postgresql://'));

      // Build broker overrides from agencyConfig.centrisBrokerUrl
      for (const w of websites) {
        const url = w.neonDatabaseUrl;
        if (!url?.startsWith('postgresql://')) continue;
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
        error:
          'No broker databases configured. Set CENTRIS_REALTOR_DATABASE_URLS or ensure SERVICE websites have neonDatabaseUrl.',
      });
    }

    const result = await runCentralCentrisSync(databaseUrls, 25, brokerOverrides.length > 0 ? brokerOverrides : undefined);

    // Realtor.ca sync for this website if realtorBrokerUrl is set
    let realtorResult: { fetched: number; imported: number; error?: string } | null = null;
    if (website.neonDatabaseUrl) {
      const ac = website.agencyConfig as Record<string, unknown> | null;
      const realtorUrl = ac?.realtorBrokerUrl as string | undefined;
      if (realtorUrl?.trim()) {
        try {
          realtorResult = await runRealtorSync(realtorUrl.trim(), website.neonDatabaseUrl);
        } catch (err) {
          realtorResult = { fetched: 0, imported: 0, error: String(err) };
        }
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: result.fetched,
      databases: result.databases.length,
      details: result.databases,
      realtor: realtorResult,
    });
  } catch (err) {
    console.error('[sync-centris]', err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
