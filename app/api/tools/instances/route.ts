import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tools/instances - List user's installed tools
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    const instances = await prisma.toolInstance.findMany({
      where,
      include: {
        definition: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            logoUrl: true,
            authType: true,
          },
        },
        _count: {
          select: { actions: true },
        },
      },
      orderBy: { installedAt: 'desc' },
    });

    // Sanitize response - don't send encrypted credentials to client
    const sanitized = instances.map((inst) => ({
      ...inst,
      credentials: { configured: true }, // Only indicate if configured
    }));

    return NextResponse.json({ success: true, instances: sanitized });
  } catch (error: any) {
    console.error('Error fetching tool instances:', error);
    return apiErrors.internal(error.message || 'Failed to fetch tool instances');
  }
}

// POST /api/tools/instances - Install a new tool
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { definitionId, name, description, credentials, config } = body;

    if (!definitionId || !name || !credentials) {
      return apiErrors.badRequest('Missing required fields: definitionId, name, credentials');
    }

    // Check if definition exists
    const definition = await prisma.toolDefinition.findUnique({
      where: { id: definitionId },
    });

    if (!definition) {
      return apiErrors.notFound('Tool definition not found');
    }

    // Check if user already has this tool installed
    const existing = await prisma.toolInstance.findUnique({
      where: {
        userId_definitionId: {
          userId: session.user.id,
          definitionId,
        },
      },
    });

    if (existing) {
      return apiErrors.conflict('Tool already installed. Use update endpoint to modify.');
    }

    // Encrypt credentials
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    const instance = await prisma.toolInstance.create({
      data: {
        userId: session.user.id,
        definitionId,
        name,
        description,
        credentials: { encrypted: encryptedCredentials },
        config: config || {},
        status: 'TESTING', // Start in testing mode
      },
      include: {
        definition: true,
      },
    });

    // Increment install count
    await prisma.toolDefinition.update({
      where: { id: definitionId },
      data: { installCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      instance: {
        ...instance,
        credentials: { configured: true },
      },
    });
  } catch (error: any) {
    console.error('Error installing tool:', error);
    return apiErrors.internal(error.message || 'Failed to install tool');
  }
}
