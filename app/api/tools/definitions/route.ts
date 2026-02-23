import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tools/definitions - List all tool definitions (public + user-created)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('public');

    const where: any = {
      OR: [
        { isPublic: true }, // Public marketplace tools
        { createdById: session.user.id }, // User's custom tools
      ],
    };

    if (category) {
      where.category = category;
    }

    if (isPublic === 'true') {
      where.isPublic = true;
    }

    const definitions = await prisma.toolDefinition.findMany({
      where,
      include: {
        _count: {
          select: { instances: true },
        },
      },
      orderBy: [
        { isOfficial: 'desc' },
        { rating: 'desc' },
        { installCount: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, definitions });
  } catch (error: any) {
    console.error('Error fetching tool definitions:', error);
    return apiErrors.internal(error.message || 'Failed to fetch tool definitions');
  }
}

// POST /api/tools/definitions - Create a new custom tool definition
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      category,
      baseUrl,
      authType,
      authConfig,
      capabilities,
      requiredScopes,
      webhookSupport,
      logoUrl,
      documentationUrl,
    } = body;

    // Validation
    if (!name || !slug || !description || !category || !authType) {
      return apiErrors.badRequest('Missing required fields: name, slug, description, category, authType');
    }

    // Check for duplicate slug
    const existing = await prisma.toolDefinition.findUnique({
      where: { slug },
    });

    if (existing) {
      return apiErrors.conflict('Tool with this slug already exists');
    }

    const definition = await prisma.toolDefinition.create({
      data: {
        name,
        slug,
        description,
        category,
        baseUrl,
        authType,
        authConfig: authConfig || {},
        capabilities: capabilities || [],
        requiredScopes: requiredScopes || [],
        webhookSupport: webhookSupport || false,
        logoUrl,
        documentationUrl,
        createdById: session.user.id,
        isPublic: false, // Custom tools are private by default
      },
    });

    return NextResponse.json({ success: true, definition });
  } catch (error: any) {
    console.error('Error creating tool definition:', error);
    return apiErrors.internal(error.message || 'Failed to create tool definition');
  }
}
