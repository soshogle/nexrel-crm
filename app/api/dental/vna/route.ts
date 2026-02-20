/**
 * VNA Configuration API
 * Phase 2: Manage VNA configurations and routing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { VnaManager } from '@/lib/dental/vna-integration';
import { encryptJSON, decryptJSON } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/vna - List VNA configurations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vnas = await (prisma as any).vnaConfiguration.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Don't return credentials in list
    const safeVnas = vnas.map((vna: any) => {
      const { credentials, ...safe } = vna;
      return safe;
    });

    return NextResponse.json({ success: true, vnas: safeVnas });
  } catch (error: any) {
    console.error('Error fetching VNAs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch VNA configurations' },
      { status: 500 }
    );
  }
}

// POST /api/dental/vna - Create VNA configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type,
      endpoint,
      aeTitle,
      host,
      port,
      credentials,
      bucket,
      region,
      pathPrefix,
      routingRules,
      priority,
      isDefault,
      description,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    let encryptedCredentials = null;
    if (credentials) {
      encryptedCredentials = encryptJSON(credentials);
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await (prisma as any).vnaConfiguration.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const vna = await (prisma as any).vnaConfiguration.create({
      data: {
        userId: session.user.id,
        name,
        type,
        endpoint,
        aeTitle,
        host,
        port,
        credentials: encryptedCredentials ? { encrypted: encryptedCredentials } : null,
        bucket,
        region,
        pathPrefix,
        routingRules: routingRules || [],
        priority: priority || 0,
        isDefault: isDefault || false,
        description,
        isActive: true,
      },
    });

    // Test connection
    const testResult = await VnaManager.testVnaConnection({
      id: vna.id,
      name: vna.name,
      type: vna.type,
      endpoint: vna.endpoint,
      aeTitle: vna.aeTitle,
      host: vna.host,
      port: vna.port,
      credentials: credentials,
      bucket: vna.bucket,
      region: vna.region,
      pathPrefix: vna.pathPrefix,
      isActive: vna.isActive,
      isDefault: vna.isDefault,
      priority: vna.priority,
    });

    // Update test status
    await (prisma as any).vnaConfiguration.update({
      where: { id: vna.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: testResult.success ? 'success' : 'failed',
        lastTestError: testResult.error || null,
      },
    });

    const { credentials: _, ...safeVna } = vna;

    return NextResponse.json({
      success: true,
      vna: safeVna,
      testResult,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating VNA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create VNA configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/dental/vna - Update VNA configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'VNA ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await (prisma as any).vnaConfiguration.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'VNA not found' }, { status: 404 });
    }

    let encryptedCredentials = existing.credentials;
    if (updateData.credentials) {
      encryptedCredentials = { encrypted: encryptJSON(updateData.credentials) };
    }

    // Handle default VNA
    if (updateData.isDefault) {
      await (prisma as any).vnaConfiguration.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updated = await (prisma as any).vnaConfiguration.update({
      where: { id },
      data: {
        ...updateData,
        credentials: encryptedCredentials,
        updatedAt: new Date(),
      },
    });

    const { credentials: _, ...safeVna } = updated;

    return NextResponse.json({
      success: true,
      vna: safeVna,
    });
  } catch (error: any) {
    console.error('Error updating VNA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update VNA configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/dental/vna - Delete VNA configuration
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'VNA ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await (prisma as any).vnaConfiguration.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'VNA not found' }, { status: 404 });
    }

    await (prisma as any).vnaConfiguration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting VNA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete VNA configuration' },
      { status: 500 }
    );
  }
}
