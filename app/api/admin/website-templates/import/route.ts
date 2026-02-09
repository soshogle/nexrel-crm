/**
 * Import Website Template from URL
 * Admin endpoint to import templates from external URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteTemplateImporter } from '@/lib/website-builder/template-importer';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, type, name, description, category } = body;

    if (!url || !type || !name) {
      return NextResponse.json(
        { error: 'URL, type, and name are required' },
        { status: 400 }
      );
    }

    if (type !== 'SERVICE' && type !== 'PRODUCT') {
      return NextResponse.json(
        { error: 'Type must be SERVICE or PRODUCT' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Import template
    const template = await websiteTemplateImporter.importTemplateFromUrl(
      url,
      type,
      name,
      description,
      category
    );

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        previewImage: template.previewImage,
      },
    });
  } catch (error: any) {
    console.error('Template import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import template' },
      { status: 500 }
    );
  }
}
