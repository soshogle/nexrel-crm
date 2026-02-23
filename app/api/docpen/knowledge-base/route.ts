/**
 * Docpen Knowledge Base API
 * 
 * GET - List knowledge base files
 * DELETE - Delete a knowledge base file
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - List knowledge base files
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const specialty = searchParams.get('specialty');

    const where: any = {
      userId: session.user.id,
    };

    if (specialty) {
      where.specialty = specialty;
    }

    if (agentId) {
      // Get files linked to a specific agent
      const agentFiles = await prisma.docpenAgentKnowledgeBaseFile.findMany({
        where: {
          agentId,
        },
        include: {
          knowledgeBaseFile: true,
        },
      });

      const files = agentFiles.map(af => ({
        ...af.knowledgeBaseFile,
        linkedAt: af.addedAt,
      }));

      return NextResponse.json({
        success: true,
        files,
      });
    }

    // Get all files for the user
    const files = await prisma.docpenKnowledgeBaseFile.findMany({
      where,
      include: {
        agents: {
          select: {
            agentId: true,
            addedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error: any) {
    console.error('❌ [Docpen KB] Error fetching files:', error);
    return apiErrors.internal(error.message || 'Failed to fetch files');
  }
}

// DELETE - Delete a knowledge base file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return apiErrors.badRequest('File ID required');
    }

    // Verify ownership
    const file = await prisma.docpenKnowledgeBaseFile.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    });

    if (!file) {
      return apiErrors.notFound('File not found');
    }

    // Delete file (cascade will remove agent links)
    await prisma.docpenKnowledgeBaseFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ [Docpen KB] Error deleting file:', error);
    return apiErrors.internal(error.message || 'Failed to delete file');
  }
}
