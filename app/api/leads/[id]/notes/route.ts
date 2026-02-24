export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadService, noteService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { apiErrors } from '@/lib/api-error';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiErrors.unauthorized()

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const lead = await leadService.findUnique(ctx, params.id)
    if (!lead) return apiErrors.notFound('Lead not found')

    const notes = await noteService.findMany(ctx, { leadId: params.id }, { take: 50 })
    return NextResponse.json(notes)
  } catch (error) {
    console.error('Get notes error:', error)
    return apiErrors.internal()
  }
}

export async function POST(
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

    const { content } = await request.json()

    if (!content || !content.trim()) {
      return apiErrors.badRequest('Content is required')
    }

    const lead = await leadService.findUnique(ctx, params.id)
    if (!lead) {
      return apiErrors.notFound('Lead not found')
    }

    const note = await noteService.create(ctx, { leadId: params.id, content: content.trim() })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Create note error:', error)
    return apiErrors.internal()
  }
}
