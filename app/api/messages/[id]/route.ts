export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { messageService } from '@/lib/dal/message-service'

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

    const ctx = getDalContextFromSession(session)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = await messageService.findFirst(ctx, { id: params.id })
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    const updatedMessage = await messageService.update(ctx, params.id, { isUsed })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('Update message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
