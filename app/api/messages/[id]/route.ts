export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { messageService } from '@/lib/dal/message-service'
import { apiErrors } from '@/lib/api-error';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const { isUsed } = await request.json()

    if (typeof isUsed !== 'boolean') {
      return apiErrors.badRequest('isUsed must be a boolean')
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) {
      return apiErrors.unauthorized()
    }
    const message = await messageService.findFirst(ctx, { id: params.id })
    if (!message) {
      return apiErrors.notFound('Message not found')
    }
    const updatedMessage = await messageService.update(ctx, params.id, { isUsed })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('Update message error:', error)
    return apiErrors.internal()
  }
}
