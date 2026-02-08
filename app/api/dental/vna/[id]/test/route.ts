/**
 * VNA Connection Test API
 * Tests connectivity to a VNA configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { VnaManager } from '@/lib/dental/vna-integration';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function decryptCredentials(encrypted: any, key: string): any {
  if (!encrypted?.encrypted) return null;
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

// POST /api/dental/vna/[id]/test - Test VNA connection
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vna = await (prisma as any).vnaConfiguration.findUnique({
      where: { id: params.id },
    });

    if (!vna || vna.userId !== session.user.id) {
      return NextResponse.json({ error: 'VNA not found' }, { status: 404 });
    }

    // Decrypt credentials
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const credentials = vna.credentials ? decryptCredentials(vna.credentials, encryptionKey) : null;

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
      where: { id: params.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: testResult.success ? 'success' : 'failed',
        lastTestError: testResult.error || null,
      },
    });

    return NextResponse.json({
      success: true,
      testResult,
    });
  } catch (error: any) {
    console.error('Error testing VNA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test VNA connection' },
      { status: 500 }
    );
  }
}
