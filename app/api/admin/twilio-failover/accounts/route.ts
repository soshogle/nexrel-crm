/**
 * GET /api/admin/twilio-failover/accounts
 * Get all Twilio accounts
 * 
 * POST /api/admin/twilio-failover/accounts
 * Create new Twilio account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.twilioAccount.findMany({
      include: {
        _count: {
          select: {
            voiceAgents: true,
            backupPhoneNumbers: true,
          },
        },
      },
      orderBy: { isPrimary: 'desc' },
    });

    // Don't return encrypted tokens in response
    const safeAccounts = accounts.map((account) => ({
      ...account,
      authToken: '***encrypted***', // Don't expose actual token
    }));

    return NextResponse.json({
      success: true,
      accounts: safeAccounts,
    });
  } catch (error: any) {
    console.error('Get accounts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, accountSid, authToken, isPrimary, envKey } = await request.json();

    if (!name || !accountSid) {
      return NextResponse.json(
        { error: 'name and accountSid required' },
        { status: 400 }
      );
    }

    // Either authToken (DB-stored) or envKey (env-based) required
    if (!authToken && !envKey) {
      return NextResponse.json(
        { error: 'authToken or envKey required' },
        { status: 400 }
      );
    }

    const encryptedToken = authToken ? encrypt(authToken) : null;

    if (isPrimary) {
      await prisma.twilioAccount.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const account = await prisma.twilioAccount.create({
      data: {
        name,
        accountSid,
        authToken: encryptedToken,
        envKey: envKey || null,
        isPrimary: isPrimary || false,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        authToken: '***encrypted***',
      },
    });
  } catch (error: any) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
