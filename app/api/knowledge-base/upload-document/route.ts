import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

// Helper function to extract text from file buffer
async function extractTextFromFile(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  try {
    // For text files, directly convert buffer to string
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    }

    // For DOCX files, use mammoth to extract text
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      try {
        console.log('📄 Extracting text from DOCX file:', fileName);
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value || '';
        console.log(`✅ Successfully extracted ${extractedText.length} characters from DOCX`);
        return extractedText;
      } catch (docxError: any) {
        console.error('Error extracting DOCX:', docxError);
        return `File: ${fileName}\nType: DOCX\n[DOCX extraction error: ${docxError.message}]`;
      }
    }

    // For DOC files (old Word format)
    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      return `File: ${fileName}\nType: DOC\nSize: ${buffer.length} bytes\n\n[Legacy DOC format detected. Please convert to DOCX for full text extraction, or copy and paste the content into the Knowledge Base text field below.]`;
    }

    // For PDF files (would need pdf-parse library)
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return `File: ${fileName}\nType: PDF\nSize: ${buffer.length} bytes\n\n[PDF text extraction not yet implemented. Please copy and paste the content into the Knowledge Base text field below.]`;
    }
    
    // For other file types, return a helpful message
    return `File: ${fileName}\nType: ${fileType}\nSize: ${buffer.length} bytes\n\n[Content extraction for ${fileType} files is not yet implemented. Please copy and paste the content into the Knowledge Base text field below.]`;
  } catch (error: any) {
    console.error('Error extracting text:', error);
    return `File: ${fileName}\n[Text extraction failed: ${error.message}]`;
  }
}

// POST /api/knowledge-base/upload-document - Upload and extract text from document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📄 Uploading knowledge base document for user:', session.user.id);

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const voiceAgentId = formData.get('voiceAgentId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      voiceAgentId,
    });

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from the file (now async)
    const extractedText = await extractTextFromFile(buffer, file.type, file.name);

    console.log('📝 Extracted text length:', extractedText.length, 'characters');

    // Handle draft agent creation if needed
    let agentIdToLink = voiceAgentId;
    
    if (!agentIdToLink) {
      // Check if user has a draft agent
      let draftAgent = await prisma.voiceAgent.findFirst({
        where: {
          userId: session.user.id,
          name: 'Draft Agent',
        },
      });

      // Create draft agent if it doesn't exist
      if (!draftAgent) {
        console.log('📝 Creating Draft Agent for user:', session.user.id);
        draftAgent = await prisma.voiceAgent.create({
          data: {
            userId: session.user.id,
            name: 'Draft Agent',
            description: 'Automatically created during onboarding. Files uploaded during onboarding are linked here.',
            type: 'INBOUND',
            status: 'TESTING',
            businessName: 'Draft',
          },
        });
        console.log('✅ Draft Agent created:', draftAgent.id);
      }
      
      agentIdToLink = draftAgent.id;
    }

    // Save file to database
    const knowledgeBaseFile = await prisma.knowledgeBaseFile.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        extractedText: extractedText,
      },
    });

    console.log('✅ Knowledge base file created:', knowledgeBaseFile.id);

    // Link file to agent via junction table
    if (agentIdToLink) {
      await prisma.voiceAgentKnowledgeBaseFile.create({
        data: {
          voiceAgentId: agentIdToLink,
          knowledgeBaseFileId: knowledgeBaseFile.id,
        },
      });
      console.log('✅ File linked to agent:', agentIdToLink);
    }

    return NextResponse.json({
      success: true,
      file: {
        id: knowledgeBaseFile.id,
        fileName: knowledgeBaseFile.fileName,
        fileType: knowledgeBaseFile.fileType,
        fileSize: knowledgeBaseFile.fileSize,
        extractedText: knowledgeBaseFile.extractedText,
        createdAt: knowledgeBaseFile.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Error uploading knowledge base document:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload document',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
