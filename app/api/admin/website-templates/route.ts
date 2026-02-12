/**
 * Website Templates API
 * Get and manage website templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { websiteTemplateImporter } from '@/lib/website-builder/template-importer';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'SERVICE' | 'PRODUCT' | null;

    const templates = await prisma.websiteTemplate.findMany({
      where: type ? { type } : undefined,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        previewImage: true,
        previewUrl: true,
        description: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, templateId } = body;

    if (action === 'set_default' && templateId) {
      const template = await websiteTemplateImporter.setDefaultTemplate(templateId);
      return NextResponse.json({
        success: true,
        template: {
          id: template.id,
          name: template.name,
          isDefault: template.isDefault,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}
