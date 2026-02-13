/**
 * Apply a template's structure to an existing website page
 * Used as fallback when Import from URL fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const { templateId, pagePath: reqPagePath } = body;
    const pagePath = reqPagePath ?? '/';

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = await prisma.websiteTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const templateStructure = template.structure as any;
    const templatePages = templateStructure?.pages || [];
    const homePage = templatePages.find(
      (p: any) => p.path === '/' || p.id === 'home'
    ) || templatePages[0];

    if (!homePage?.components?.length) {
      return NextResponse.json(
        { error: 'Template has no components to apply' },
        { status: 400 }
      );
    }

    const structure = (website.structure || {}) as any;
    let pages = structure?.pages || [];
    if (pages.length === 0) {
      pages = [{ id: 'home', name: 'Home', path: '/', components: [] }];
      structure.pages = pages;
    }
    let pageIndex = pages.findIndex((p: any) => p.path === pagePath);
    if (pageIndex < 0) {
      pageIndex = pages.findIndex((p: any) => p.path === '/');
    }
    if (pageIndex < 0) pageIndex = 0;

    const newStructure = JSON.parse(JSON.stringify(structure));
    const targetPage = newStructure.pages[pageIndex];
    if (!targetPage) {
      return NextResponse.json(
        { error: 'Page not found in website structure' },
        { status: 400 }
      );
    }

    // Add template components with fresh IDs to avoid collisions
    const ts = Date.now();
    const newComponents = homePage.components.map((c: any, i: number) => ({
      ...c,
      id: `${c.type?.toLowerCase() || 'comp'}-${ts}-${i}`,
    }));

    targetPage.components = targetPage.components || [];
    targetPage.components.push(...newComponents);

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
    console.error('[Apply template]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to apply template' },
      { status: 500 }
    );
  }
}
