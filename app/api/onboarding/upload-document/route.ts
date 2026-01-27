
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { documentExtractor } from '@/lib/document-extractor';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Extract text from document
    const extractedDoc = await documentExtractor.extractText(file);

    if (!extractedDoc.success || !extractedDoc.text || extractedDoc.text.trim().length === 0) {
      return NextResponse.json(
        { error: extractedDoc.error || 'Could not extract text from document' },
        { status: 400 }
      );
    }

    const extractedText = extractedDoc.text;

    // Get current progress
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingProgress: true },
    });

    let progress: any = {};
    if (user?.onboardingProgress) {
      try {
        progress = JSON.parse(user.onboardingProgress as string);
      } catch (e) {
        progress = {};
      }
    }

    // Add extracted text to knowledge base
    if (!progress.uploadedDocuments) {
      progress.uploadedDocuments = [];
    }

    progress.uploadedDocuments.push({
      fileName: file.name,
      fileType: file.type,
      extractedText: extractedText.substring(0, 5000), // Limit to 5000 chars
      uploadedAt: new Date().toISOString(),
    });

    // Save progress
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingProgress: JSON.stringify(progress),
      },
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      textLength: extractedText.length,
      message: `Extracted ${extractedText.length} characters from ${file.name}`,
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}
