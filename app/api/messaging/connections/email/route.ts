
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Simple encryption helper (in production, use proper encryption)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function encrypt(text: string): string {
  return Buffer.from(text).toString('base64')
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

    const { email, password, smtpHost, smtpPort, imapHost, imapPort } = await request.json()

    if (!email || !password || !smtpHost || !smtpPort || !imapHost || !imapPort) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if connection already exists
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'EMAIL',
        channelIdentifier: email
      }
    })

    const connectionData = {
      status: 'CONNECTED' as const,
      providerType: 'custom_email',
      providerData: {
        email,
        password: encrypt(password),
        smtpHost,
        smtpPort: parseInt(smtpPort),
        imapHost,
        imapPort: parseInt(imapPort)
      }
    }

    if (existingConnection) {
      // Update existing connection
      const updated = await prisma.channelConnection.update({
        where: { id: existingConnection.id },
        data: connectionData
      })

      return NextResponse.json({ success: true, connection: updated })
    }

    // Create new connection
    const connection = await prisma.channelConnection.create({
      data: {
        userId: user.id,
        channelType: 'EMAIL',
        channelIdentifier: email,
        displayName: email,
        ...connectionData
      }
    })

    return NextResponse.json({ success: true, connection })
  } catch (error) {
    console.error('Failed to connect email:', error)
    return NextResponse.json(
      { error: 'Failed to connect email' },
      { status: 500 }
    )
  }
}
