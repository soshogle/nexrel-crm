
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const connections = await prisma.channelConnection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    // Remove sensitive data before sending to client
    const sanitizedConnections = connections.map((conn: any) => ({
      id: conn.id,
      channelType: conn.channelType,
      displayName: conn.displayName,
      channelIdentifier: conn.channelIdentifier,
      status: conn.status,
      providerType: conn.providerType,
      errorMessage: conn.errorMessage,
      createdAt: conn.createdAt.toISOString()
    }))

    return NextResponse.json(sanitizedConnections)
  } catch (error) {
    console.error('Failed to fetch connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}
