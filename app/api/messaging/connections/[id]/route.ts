
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership
    const connection = await prisma.channelConnection.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!connection) {
      return apiErrors.notFound('Connection not found')
    }

    // Delete the connection
    await prisma.channelConnection.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete connection:', error)
    return apiErrors.internal('Failed to delete connection')
  }
}
