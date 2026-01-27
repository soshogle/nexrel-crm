/**
 * Docpen Knowledge Base Upload API
 * 
 * POST - Upload and process a document for training
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

// Helper function to extract text from file buffer
async function extractTextFromFile(
  buffer: Buffer,
  fileType: string,
  fileName: string
): Promise<string> {
  try {
    // For text files
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    }

    // For DOCX files
    if (
      fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
      } catch (docxError: any) {
        return `[DOCX extraction error: ${docxError.message}]`;
      }
    }

    // For DOC files
    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      return `[Legacy DOC format - please convert to DOCX or TXT]`;
    }

    // For PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return `[PDF content - text extraction pending]`;
    }

    // For other file types
    return `[File type ${fileType} - manual content extraction required]`;
  } catch (error: any) {
    return `[Text extraction failed: ${error.message}]`;
  }
}

// POST - Upload document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const specialty = formData.get('specialty') as string | null;
    const customSpecialty = formData.get('customSpecialty') as string | null;
    const agentId = formData.get('agentId') as string | null;
    const tagsRaw = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('📄 [Docpen KB] Uploading file:', file.name, 'for specialty:', specialty);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const extractedText = await extractTextFromFile(
      buffer,
      file.type,
      file.name
    );

    // Parse tags
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Create knowledge base file
    const kbFile = await prisma.docpenKnowledgeBaseFile.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        extractedText,
        specialty: specialty as any || null,
        customSpecialty,
        tags,
      },
    });

    console.log('✅ [Docpen KB] File created:', kbFile.id);

    // Link to agent if specified
    if (agentId) {
      // Verify agent ownership
      const agent = await prisma.docpenVoiceAgent.findFirst({
        where: {
          id: agentId,
          userId: session.user.id,
        },
      });

      if (agent) {
        await prisma.docpenAgentKnowledgeBaseFile.create({
          data: {
            agentId,
            fileId: kbFile.id,
          },
        });
        console.log('✅ [Docpen KB] Linked to agent:', agentId);
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        id: kbFile.id,
        fileName: kbFile.fileName,
        fileType: kbFile.fileType,
        fileSize: kbFile.fileSize,
        specialty: kbFile.specialty,
        tags: kbFile.tags,
        extractedText: extractedText.substring(0, 500) + '...',
        createdAt: kbFile.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ [Docpen KB] Error uploading:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
