import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/knowledge-base - Fetch all knowledge base files for the user
// Optional query parameter: voiceAgentId - filter files for a specific voice agent
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const voiceAgentId = searchParams.get('voiceAgentId');
    const unassigned = searchParams.get('unassigned'); // "true" to fetch only unassigned files (deprecated - files can now be shared)

    console.log('📚 Fetching knowledge base files for user:', session.user.id, 'voiceAgentId:', voiceAgentId, 'unassigned:', unassigned);

    let knowledgeBaseFiles;

    if (voiceAgentId) {
      // Fetch files associated with a specific agent via junction table
      const agentFileAssociations = await prisma.voiceAgentKnowledgeBaseFile.findMany({
        where: {
          voiceAgentId: voiceAgentId,
        },
        include: {
          knowledgeBaseFile: {
            include: {
              voiceAgents: {
                select: {
                  voiceAgentId: true,
                },
              },
            },
          },
        },
        orderBy: {
          addedAt: 'desc',
        },
      });

      // Extract files and filter by userId for security
      knowledgeBaseFiles = agentFileAssociations
        .map(assoc => assoc.knowledgeBaseFile)
        .filter(file => file.userId === session.user.id)
        .map(file => ({
          id: file.id,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          extractedText: file.extractedText,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          associatedAgents: file.voiceAgents.map(va => va.voiceAgentId),
        }));
    } else if (unassigned === 'true') {
      // Fetch files not associated with ANY agent (legacy support - though files can now be shared)
      // Get all file IDs that have associations
      const associatedFileIds = await prisma.voiceAgentKnowledgeBaseFile.findMany({
        select: {
          knowledgeBaseFileId: true,
        },
        distinct: ['knowledgeBaseFileId'],
      });

      const associatedIds = associatedFileIds.map(a => a.knowledgeBaseFileId);

      const unassignedFiles = await prisma.knowledgeBaseFile.findMany({
        where: {
          userId: session.user.id,
          id: {
            notIn: associatedIds.length > 0 ? associatedIds : undefined,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          voiceAgents: {
            select: {
              voiceAgentId: true,
            },
          },
        },
      });

      knowledgeBaseFiles = unassignedFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        extractedText: file.extractedText,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        associatedAgents: file.voiceAgents.map(va => va.voiceAgentId),
      }));
    } else {
      // Fetch all user's files with their agent associations
      const allFiles = await prisma.knowledgeBaseFile.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          voiceAgents: {
            select: {
              voiceAgentId: true,
            },
          },
        },
      });

      knowledgeBaseFiles = allFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        extractedText: file.extractedText,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        associatedAgents: file.voiceAgents.map(va => va.voiceAgentId),
      }));
    }

    console.log(`✅ Found ${knowledgeBaseFiles.length} knowledge base file(s)`);

    return NextResponse.json({
      success: true,
      knowledgeBase: knowledgeBaseFiles,
    });
  } catch (error: any) {
    console.error('❌ Error fetching knowledge base files:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch knowledge base files',
      },
      { status: 500 }
    );
  }
}
