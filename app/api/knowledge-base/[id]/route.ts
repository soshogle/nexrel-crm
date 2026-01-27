import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/knowledge-base/[id] - Delete a knowledge base file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const fileId = params.id;

    console.log('🗑️  Deleting knowledge base file:', fileId);

    // Verify the file belongs to this user before deleting
    const file = await prisma.knowledgeBaseFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (file.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this file' },
        { status: 403 }
      );
    }

    // Delete the file
    await prisma.knowledgeBaseFile.delete({
      where: { id: fileId },
    });

    console.log('✅ Knowledge base file deleted:', fileId);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting knowledge base file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
