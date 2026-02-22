/**
 * Import sections from a URL into an existing website page
 * Runs async in background - returns immediately with "come back later" message
 */

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

export const maxDuration = 300; // 5 min - scraping can take a while, waitUntil keeps function alive
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession, createDalContext } from '@/lib/context/industry-context';
import { websiteService, getCrmDb } from '@/lib/dal';
import { websiteScraper } from '@/lib/website-builder/scraper';
import { convertScrapedToComponents } from '@/lib/website-builder/convert-scraped-to-structure';
import { downloadExternalImagesInStructure } from '@/lib/website-builder/download-external-images';

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    return new URL(u).href;
  } catch {
    return u;
  }
}

async function processImportInBackground(
  websiteId: string,
  buildId: string,
  url: string,
  pagePath: string,
  userId: string
) {
  const ctx = createDalContext(userId);
  try {
    const downloadImages = process.env.ENABLE_IMAGE_DOWNLOAD === 'true';
    // Try simple fetch first (faster, works on Vercel). Scraper falls back to Playwright if blocked.
    const useJsRendering = false;
    const scrapedData = await websiteScraper.scrapeWebsite(
      url,
      userId,
      websiteId,
      downloadImages,
      useJsRendering
    );

    const newComponents = convertScrapedToComponents(scrapedData);
    if (newComponents.length === 0) {
      await getCrmDb(ctx).websiteBuild.update({
        where: { id: buildId },
        data: { status: 'FAILED', error: 'No sections could be extracted from the URL', completedAt: new Date() },
      });
      return;
    }

    const website = await websiteService.findUnique(ctx, websiteId);
    if (!website) {
      await getCrmDb(ctx).websiteBuild.update({
        where: { id: buildId },
        data: { status: 'FAILED', error: 'Website not found', completedAt: new Date() },
      });
      return;
    }

    const structure = (website.structure || {}) as any;
    let pages = structure?.pages || [];
    if (pages.length === 0) {
      pages = [{ id: 'home', name: 'Home', path: '/', components: [] }];
      structure.pages = pages;
    }

    let pageIndex = pages.findIndex((p: any) => p.path === pagePath);
    const newStructure = JSON.parse(JSON.stringify(structure));
    let targetPage = newStructure.pages[pageIndex];

    // If page doesn't exist, create it (enables multi-page import: /, /about, /bio, etc.)
    if (!targetPage) {
      const pageId = pagePath === '/' ? 'home' : pagePath.slice(1).replace(/\//g, '-') || 'page';
      const pageName = pagePath === '/'
        ? 'Home'
        : pagePath.slice(1).split(/[-/]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      targetPage = { id: pageId, name: pageName, path: pagePath, components: [] };
      newStructure.pages.push(targetPage);
    }

    if (!targetPage.components) {
      targetPage.components = [];
    }
    targetPage.components.push(...newComponents);

    // Download any remaining external images to blob storage (one store for all owners)
    let structureToSave = newStructure;
    try {
      structureToSave = await downloadExternalImagesInStructure(newStructure, userId, websiteId);
    } catch (imgErr: any) {
      console.warn('[Import from URL] Image download failed (using original URLs):', imgErr.message);
    }

    await websiteService.update(ctx, websiteId, { structure: structureToSave });

    const { triggerWebsiteDeploy } = await import('@/lib/website-builder/deploy-trigger');
    triggerWebsiteDeploy(websiteId).catch((e) => console.warn('[Import from URL] Deploy:', e));

    await getCrmDb(ctx).websiteBuild.update({
      where: { id: buildId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        buildData: { addedCount: newComponents.length },
      },
    });
  } catch (error: any) {
    console.error('[Import from URL background]', error);
    await getCrmDb(ctx).websiteBuild.update({
      where: { id: buildId },
      data: {
        status: 'FAILED',
        error: error?.message || 'Import failed',
        completedAt: new Date(),
      },
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: websiteId } = typeof (params as any).then === 'function' ? await (params as Promise<{ id: string }>) : (params as { id: string });
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await websiteService.findUnique(ctx, websiteId);

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    let body: { url?: string; pagePath?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { url, pagePath: reqPagePath } = body || {};
    const pagePath = reqPagePath ?? '/';

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeUrl(url);

    // Create build record for tracking
    const build = await getCrmDb(ctx).websiteBuild.create({
      data: {
        websiteId,
        buildType: 'UPDATE',
        status: 'IN_PROGRESS',
        progress: 0,
        sourceUrl: normalizedUrl,
        buildData: { type: 'import', url: normalizedUrl, pagePath },
      },
    });

    // Run import in background - waitUntil keeps serverless alive until it completes
    waitUntil(
      processImportInBackground(
        websiteId,
        build.id,
        normalizedUrl,
        pagePath,
        ctx.userId
      )
    );

    return NextResponse.json({
      success: true,
      status: 'in_progress',
      message: 'Import started. Come back in a minute or refresh to see your new sections.',
      buildId: build.id,
    });
  } catch (error: any) {
    console.error('[Import from URL]', error);
    const message = error?.message || 'Failed to start import';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
