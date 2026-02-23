
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { noteService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
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

    const { content } = await request.json()

    if (!content || !content.trim()) {
      return apiErrors.badRequest('Content is required')
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    // Verify note belongs to user
    const note = await noteService.findFirst(ctx, { id: params.id })

    if (!note) {
      return apiErrors.notFound('Note not found')
    }

    const updatedNote = await noteService.update(ctx, params.id, { content: content.trim() })

    return NextResponse.json(updatedNote)
  } catch (error) {
    console.error('Update note error:', error)
    return apiErrors.internal()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    // Verify note belongs to user
    const note = await noteService.findFirst(ctx, { id: params.id })

    if (!note) {
      return apiErrors.notFound('Note not found')
    }

    await noteService.delete(ctx, params.id)

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Delete note error:', error)
    return apiErrors.internal()
  }
}
