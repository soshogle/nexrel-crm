
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-dev-key-32-chars-long!!';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    // Legacy base64 fallback
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(parts[2], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { accountSid, authToken, phoneNumber } = await request.json()

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate Twilio credentials by making a test API call
    try {
      const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${twilioAuth}`
          }
        }
      )

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Invalid Twilio credentials' },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error('Twilio validation error:', error)
      return NextResponse.json(
        { error: 'Failed to validate Twilio credentials' },
        { status: 400 }
      )
    }

    // Check if connection already exists
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'SMS',
        channelIdentifier: phoneNumber
      }
    })

    if (existingConnection) {
      // Update existing connection
      const updated = await prisma.channelConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'CONNECTED',
          providerData: {
            accountSid: encrypt(accountSid),
            authToken: encrypt(authToken),
            phoneNumber
          }
        }
      })

      return NextResponse.json({ success: true, connection: updated })
    }

    // Create new connection
    const connection = await prisma.channelConnection.create({
      data: {
        userId: user.id,
        channelType: 'SMS',
        channelIdentifier: phoneNumber,
        displayName: `Twilio ${phoneNumber}`,
        status: 'CONNECTED',
        providerType: 'twilio',
        providerData: {
          accountSid: encrypt(accountSid),
          authToken: encrypt(authToken),
          phoneNumber
        }
      }
    })

    return NextResponse.json({ success: true, connection })
  } catch (error) {
    console.error('Failed to connect Twilio:', error)
    return NextResponse.json(
      { error: 'Failed to connect Twilio' },
      { status: 500 }
    )
  }
}
