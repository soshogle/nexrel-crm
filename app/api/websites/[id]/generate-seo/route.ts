/**
 * Auto-generate SEO metadata for an existing website.
 * POST /api/websites/:id/generate-seo
 * Populates global seoData and per-page SEO so owners only need to review/edit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { seoAutomation } from '@/lib/website-builder/seo-automation';
import { extractPages } from '@/lib/website-builder/extract-pages';

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
      select: {
        id: true,
        name: true,
        structure: true,
        seoData: true,
        vercelDeploymentUrl: true,
        questionnaireAnswers: true,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const structure = (website.structure || {}) as any;
    const qa = (website.questionnaireAnswers || {}) as any;
    const existingSeo = (website.seoData || {}) as any;

    const seoConfig = {
      websiteUrl:
        website.vercelDeploymentUrl ||
        `https://${website.name.toLowerCase().replace(/\s+/g, '-')}.com`,
      businessName: qa.businessName || website.name,
      businessDescription: qa.businessDescription || existingSeo.description || '',
      contactEmail: qa.contactInfo?.email,
      contactPhone: qa.contactInfo?.phone,
      address: qa.contactInfo?.address
        ? { street: qa.contactInfo.address }
        : undefined,
    };

    const { globalSeo, pagesWithSeo } = seoAutomation.generateAutoSeo(
      structure,
      seoConfig
    );

    // Merge: keep any user-set values, fill blanks
    const mergedSeo = { ...globalSeo, ...existingSeo };
    if (!mergedSeo.title) mergedSeo.title = globalSeo.title;
    if (!mergedSeo.description) mergedSeo.description = globalSeo.description;
    if (!mergedSeo.keywords?.length) mergedSeo.keywords = globalSeo.keywords;
    if (!mergedSeo.canonicalUrl) mergedSeo.canonicalUrl = globalSeo.canonicalUrl;
    if (!mergedSeo.ogTitle) mergedSeo.ogTitle = globalSeo.ogTitle;
    if (!mergedSeo.ogDescription) mergedSeo.ogDescription = globalSeo.ogDescription;
    if (!mergedSeo.twitterCard) mergedSeo.twitterCard = globalSeo.twitterCard;

    // Merge per-page SEO into structure
    const updatedStructure = { ...structure };
    if (Array.isArray(updatedStructure.pages)) {
      updatedStructure.pages = pagesWithSeo;
    } else {
      // If structure doesn't use .pages, embed seo into existing pages
      const existingPages = extractPages(structure);
      if (existingPages.length > 0 && pagesWithSeo.length > 0) {
        updatedStructure.pages = pagesWithSeo;
      }
    }

    await prisma.website.update({
      where: { id: website.id },
      data: {
        seoData: mergedSeo,
        structure: updatedStructure,
      },
    });

    return NextResponse.json({
      success: true,
      globalSeo: mergedSeo,
      pagesCount: pagesWithSeo.length,
    });
  } catch (error: any) {
    console.error('Generate SEO error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate SEO' },
      { status: 500 }
    );
  }
}
