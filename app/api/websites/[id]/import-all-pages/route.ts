/**
 * Import all pages from a base URL into the website structure.
 * Scrapes each navConfig page path and populates structure with real content.
 * Used for sites like Theodora (created outside website builder) with empty structure.
 */

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

export const maxDuration = 300;
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession, createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, websiteService } from '@/lib/dal';
import { websiteScraper } from '@/lib/website-builder/scraper';
import { convertScrapedToComponents } from '@/lib/website-builder/convert-scraped-to-structure';
import { downloadExternalImagesInStructure } from '@/lib/website-builder/download-external-images';
import { getNavPagePaths } from '@/lib/website-builder/extract-pages';

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    return new URL(u).href;
  } catch {
    return u;
  }
}

function buildFullUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const p = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function processImportAllInBackground(
  websiteId: string,
  buildId: string,
  baseUrl: string,
  userId: string
) {
  try {
    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);
    const website = await db.website.findFirst({
      where: { id: websiteId },
    });
    if (!website) {
      await db.websiteBuild.update({
        where: { id: buildId },
        data: { status: 'FAILED', error: 'Website not found', completedAt: new Date() },
      });
      return;
    }

    const pagePaths = getNavPagePaths(website.navConfig as Record<string, unknown> | null);
    if (pagePaths.length === 0) {
      await db.websiteBuild.update({
        where: { id: buildId },
        data: { status: 'FAILED', error: 'No pages in nav config', completedAt: new Date() },
      });
      return;
    }

    const downloadImages = process.env.ENABLE_IMAGE_DOWNLOAD === 'true';
    const useJsRendering = process.env.ENABLE_JS_SCRAPING === 'true';

    const structure = (website.structure || {}) as any;
    if (!structure.pages) structure.pages = [];

    let totalAdded = 0;
    const pageResults: { path: string; label: string; status: string; components: number; error?: string }[] = [];

    for (let i = 0; i < pagePaths.length; i++) {
      const { path, label } = pagePaths[i];
      const fullUrl = buildFullUrl(baseUrl, path);

      await db.websiteBuild.update({
        where: { id: buildId },
        data: {
          progress: Math.round(((i + 0.5) / pagePaths.length) * 100),
          buildData: { type: 'import_all', currentPage: label, total: pagePaths.length, pageResults },
        },
      });

      try {
        const scrapedData = await websiteScraper.scrapeWebsite(
          fullUrl,
          userId,
          websiteId,
          downloadImages,
          useJsRendering
        );

        const components = convertScrapedToComponents(scrapedData);
        if (components.length === 0) {
          console.warn(`[Import all] ${fullUrl}: scraped OK but 0 components extracted (HTML may be SPA shell)`);
          pageResults.push({ path, label, status: 'empty', components: 0 });
          continue;
        }

        const pageId = path === '/' ? 'home' : path.slice(1).replace(/\//g, '-') || 'page';
        const pageName = path === '/' ? 'Home' : label;

        const existingIdx = structure.pages.findIndex((p: any) => p.path === path);
        const pageData = {
          id: pageId,
          name: pageName,
          path,
          components,
          seo: scrapedData.seo || {},
        };

        if (existingIdx >= 0) {
          structure.pages[existingIdx] = pageData;
        } else {
          structure.pages.push(pageData);
        }
        totalAdded += components.length;
        pageResults.push({ path, label, status: 'ok', components: components.length });
        console.log(`[Import all] ✅ ${fullUrl}: ${components.length} components`);
      } catch (pageErr: any) {
        console.warn(`[Import all] ❌ Failed to scrape ${fullUrl}:`, pageErr.message);
        pageResults.push({ path, label, status: 'error', components: 0, error: pageErr.message });
      }
    }

    console.log(`[Import all] Summary: ${pageResults.filter(r => r.status === 'ok').length}/${pagePaths.length} pages imported, ${totalAdded} total components`);

    let structureToSave = structure;
    try {
      structureToSave = await downloadExternalImagesInStructure(structure, userId, websiteId);
    } catch (imgErr: any) {
      console.warn('[Import all] Image download failed:', imgErr.message);
    }

    await websiteService.update(ctx, websiteId, { structure: structureToSave });

    const { triggerWebsiteDeploy } = await import('@/lib/website-builder/deploy-trigger');
    triggerWebsiteDeploy(websiteId).catch((e) => console.warn('[Import all] Deploy:', e));

    await db.websiteBuild.update({
      where: { id: buildId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        buildData: {
          type: 'import_all',
          addedCount: totalAdded,
          pagesImported: pageResults.filter(r => r.status === 'ok').length,
          pagesTotal: pagePaths.length,
          pageResults,
        },
      },
    });
  } catch (error: any) {
    console.error('[Import all background]', error);
    const db = getCrmDb(createDalContext(userId));
    await db.websiteBuild.update({
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
    const { id: websiteId } = typeof (params as any).then === 'function'
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    const hasSecretAuth = !!(expectedSecret && secret === expectedSecret);

    if (!session?.user?.id && !hasSecretAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getCrmDb(createDalContext('bootstrap'));
    const website = session?.user?.id
      ? await websiteService.findUnique(
          getDalContextFromSession(session)!,
          websiteId
        )
      : await db.website.findFirst({ where: { id: websiteId } });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    let body: { baseUrl?: string };
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const baseUrl = body?.baseUrl?.trim() || (website.vercelDeploymentUrl || '').trim();
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Base URL is required. Provide baseUrl or set vercelDeploymentUrl on the website.' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeUrl(baseUrl);

    const buildDb = getCrmDb(createDalContext(session?.user?.id || website.userId));
    const build = await buildDb.websiteBuild.create({
      data: {
        websiteId,
        buildType: 'UPDATE',
        status: 'IN_PROGRESS',
        progress: 0,
        sourceUrl: normalizedUrl,
        buildData: { type: 'import_all', url: normalizedUrl },
      },
    });

    const userId = session?.user?.id || website.userId;
    waitUntil(
      processImportAllInBackground(websiteId, build.id, normalizedUrl, userId)
    );

    return NextResponse.json({
      success: true,
      status: 'in_progress',
      message: 'Importing all pages from your site. This may take a few minutes. Refresh to see progress.',
      buildId: build.id,
    });
  } catch (error: any) {
    console.error('[Import all]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start import' },
      { status: 500 }
    );
  }
}
