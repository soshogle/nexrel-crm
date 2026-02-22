
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { noteService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify note belongs to user
    const note = await noteService.findFirst(ctx, { id: params.id })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const updatedNote = await noteService.update(ctx, params.id, { content: content.trim() })

    return NextResponse.json(updatedNote)
  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify note belongs to user
    const note = await noteService.findFirst(ctx, { id: params.id })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await noteService.delete(ctx, params.id)

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
