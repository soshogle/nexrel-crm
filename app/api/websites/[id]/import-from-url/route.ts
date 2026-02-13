/**
 * Import sections from a URL into an existing website page
 * Uses the same scrape + convert logic as the clone/rebuild flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { websiteScraper } from '@/lib/website-builder/scraper';
import { convertScrapedToComponents } from '@/lib/website-builder/convert-scraped-to-structure';

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    return new URL(u).href;
  } catch {
    return u;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json();
    const { url, pagePath: reqPagePath } = body;
    const pagePath = reqPagePath ?? '/';

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeUrl(url);

    // Scrape the source URL (no image download for speed; user can replace images later)
    const downloadImages = process.env.ENABLE_IMAGE_DOWNLOAD === 'true';
    const useJsRendering = process.env.ENABLE_JS_SCRAPING === 'true';
    const scrapedData = await websiteScraper.scrapeWebsite(
      normalizedUrl,
      session.user.id,
      website.id,
      downloadImages,
      useJsRendering
    );

    const newComponents = convertScrapedToComponents(scrapedData);
    if (newComponents.length === 0) {
      return NextResponse.json(
        { error: 'No sections could be extracted from the URL' },
        { status: 400 }
      );
    }

    const structure = (website.structure || {}) as any;
    const pages = structure?.pages || [];
    let pageIndex = pages.findIndex((p: any) => p.path === pagePath);
    if (pageIndex < 0) {
      pageIndex = pages.findIndex((p: any) => p.path === '/');
    }
    if (pageIndex < 0) pageIndex = 0;

    const newStructure = JSON.parse(JSON.stringify(structure));
    if (!newStructure.pages[pageIndex].components) {
      newStructure.pages[pageIndex].components = [];
    }
    newStructure.pages[pageIndex].components.push(...newComponents);

    await prisma.website.update({
      where: { id: params.id },
      data: { structure: newStructure },
    });

    return NextResponse.json({
      success: true,
      addedCount: newComponents.length,
      structure: newStructure,
    });
  } catch (error: any) {
    console.error('[Import from URL]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import from URL' },
      { status: 500 }
    );
  }
}
