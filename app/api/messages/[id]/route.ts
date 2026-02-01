
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isUsed } = await request.json()

    if (typeof isUsed !== 'boolean') {
      return NextResponse.json({ error: 'isUsed must be a boolean' }, { status: 400 })
    }

    // Verify message belongs to user
    const message = await prisma.message.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const updatedMessage = await prisma.message.update({
      where: { id: params.id },
      data: { isUsed }
    })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('Update message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
