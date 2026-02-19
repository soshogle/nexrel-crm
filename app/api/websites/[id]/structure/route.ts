/**
 * Website structure partial updates (layout, global styles)
 * PATCH merges updates into structure without full replace
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateSectionLayout } from '@/lib/website-builder/granular-tools';
import { triggerWebsiteDeploy } from '@/lib/website-builder/deploy-trigger';

export async function PATCH(
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
    const { type, sectionType, sectionIndex, layout, globalStyles, props, pagePath: reqPagePath } = body;
    const pagePath = reqPagePath ?? '/';

    const structure = (website.structure || {}) as any;

    if (type === 'section_props' && props && sectionType) {
      const pages = structure?.pages || [];
      let pageIndex = pages.findIndex((p: any) => p.path === pagePath);
      if (pageIndex < 0) pageIndex = Math.max(0, pages.findIndex((p: any) => p.path === '/'));
      if (pageIndex >= 0 && pages[pageIndex].components) {
        const compIndex = pages[pageIndex].components.findIndex((c: any) => c.type === sectionType);
        if (compIndex >= 0) {
          const newStructure = JSON.parse(JSON.stringify(structure));
          newStructure.pages[pageIndex].components[compIndex].props = {
            ...(newStructure.pages[pageIndex].components[compIndex].props || {}),
            ...props,
          };
          await prisma.website.update({
            where: { id: params.id },
            data: { structure: newStructure },
          });
          triggerWebsiteDeploy(params.id).catch((e) => console.warn('[Structure PATCH] Deploy:', e));
          return NextResponse.json({ success: true });
        }
      }
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    if (type === 'section_layout' && layout) {
      const newStructure = updateSectionLayout(structure, {
        pagePath,
        sectionType,
        sectionIndex,
        layout: {
          padding: layout.padding,
          margin: layout.margin,
          alignment: layout.alignment,
          visibility: layout.visibility,
        },
      });

      await prisma.website.update({
        where: { id: params.id },
        data: { structure: newStructure },
      });
      triggerWebsiteDeploy(params.id).catch((e) => console.warn('[Structure PATCH] Deploy:', e));
      return NextResponse.json({ success: true });
    }

    if (type === 'global_styles' && globalStyles) {
      const newStructure = JSON.parse(JSON.stringify(structure));
      newStructure.globalStyles = {
        ...(newStructure.globalStyles || {}),
        ...(globalStyles.fonts && { fonts: { ...(newStructure.globalStyles?.fonts || {}), ...globalStyles.fonts } }),
        ...(globalStyles.colors && { colors: { ...(newStructure.globalStyles?.colors || {}), ...globalStyles.colors } }),
        ...(globalStyles.spacing && { spacing: { ...(newStructure.globalStyles?.spacing || {}), ...globalStyles.spacing } }),
      };

      await prisma.website.update({
        where: { id: params.id },
        data: { structure: newStructure },
      });
      triggerWebsiteDeploy(params.id).catch((e) => console.warn('[Structure PATCH] Deploy:', e));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Structure update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update structure' },
      { status: 500 }
    );
  }
}
