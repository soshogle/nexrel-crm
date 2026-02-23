import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// DELETE /api/soshogle/connections/[id] - Disconnect a social media channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify ownership
    const connection = await prisma.channelConnection.findUnique({
      where: { id: params.id },
    });

    if (!connection) {
      return apiErrors.notFound('Connection not found');
    }

    if (connection.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    // Delete the connection
    await prisma.channelConnection.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting connection:', error);
    return apiErrors.internal('Failed to delete connection');
  }
}
