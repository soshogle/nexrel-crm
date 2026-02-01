import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple encryption helper (replace with proper encryption service in production)
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-12';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key.slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  try {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-12';
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return text; // Return as-is if decryption fails
  }
}

// GET /api/tools/instances - List user's installed tools
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tool instances' },
      { status: 500 }
    );
  }
}

// POST /api/tools/instances - Install a new tool
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { definitionId, name, description, credentials, config } = body;

    if (!definitionId || !name || !credentials) {
      return NextResponse.json(
        { error: 'Missing required fields: definitionId, name, credentials' },
        { status: 400 }
      );
    }

    // Check if definition exists
    const definition = await prisma.toolDefinition.findUnique({
      where: { id: definitionId },
    });

    if (!definition) {
      return NextResponse.json(
        { error: 'Tool definition not found' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'Tool already installed. Use update endpoint to modify.' },
        { status: 409 }
      );
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
    return NextResponse.json(
      { error: error.message || 'Failed to install tool' },
      { status: 500 }
    );
  }
}
