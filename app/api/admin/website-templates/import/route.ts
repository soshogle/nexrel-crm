/**
 * Import Website Template from URL
 * Admin endpoint to import templates from external URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteTemplateImporter } from '@/lib/website-builder/template-importer';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { url, type, name, description, category } = body;

    if (!url || !type || !name) {
      return apiErrors.badRequest('URL, type, and name are required');
    }

    if (type !== 'SERVICE' && type !== 'PRODUCT') {
      return apiErrors.badRequest('Type must be SERVICE or PRODUCT');
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return apiErrors.badRequest('Invalid URL format');
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
    return apiErrors.internal(error.message || 'Failed to import template');
  }
}
