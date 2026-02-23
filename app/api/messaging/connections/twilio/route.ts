
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return apiErrors.unauthorized()
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return apiErrors.notFound('User not found')
    }

    const { accountSid, authToken, phoneNumber } = await request.json()

    if (!accountSid || !authToken || !phoneNumber) {
      return apiErrors.badRequest('Missing required fields')
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
        return apiErrors.badRequest('Invalid Twilio credentials')
      }
    } catch (error) {
      console.error('Twilio validation error:', error)
      return apiErrors.badRequest('Failed to validate Twilio credentials')
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
    return apiErrors.internal('Failed to connect Twilio')
  }
}
