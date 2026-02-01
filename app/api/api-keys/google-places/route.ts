
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        userId: session.user.id,
        service: 'google_places',
        isActive: true
      }
    })

    return NextResponse.json({ hasKey: !!apiKey })
  } catch (error) {
    console.error('Get API key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Deactivate existing keys
    await prisma.apiKey.updateMany({
      where: {
        userId: session.user.id,
        service: 'google_places'
      },
      data: {
        isActive: false
      }
    })

    // Create new key
    const newApiKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        service: 'google_places',
        keyName: 'api_key',
        keyValue: apiKey,
        isActive: true
      }
    })

    return NextResponse.json({ 
      message: 'API key saved successfully',
      keyId: newApiKey.id 
    })
  } catch (error) {
    console.error('Save API key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
