/**
 * X-Ray AI Analysis API
 * Analyzes X-ray images using GPT-4 Vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/dental/xrays/[id]/analyze - Analyze X-ray with AI
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find X-ray
    // Note: Model name will be available after running: npx prisma generate
    const xray = await (prisma as any).dentalXRay.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!xray) {
      return NextResponse.json(
        { error: 'X-ray not found' },
        { status: 404 }
      );
    }

    // Get image URL for analysis
    // For now, use the stored imageUrl or generate download URL
    let imageUrl: string | null = null;
    if (xray.imageUrl) {
      imageUrl = xray.imageUrl;
    } else if (xray.imageFile) {
      // Generate download URL from API endpoint
      imageUrl = `/api/dental/xrays/${xray.id}/image`;
    } else if (xray.dicomFile) {
      // TODO: Convert DICOM to image for analysis
      // For now, return error if only DICOM is available
      return NextResponse.json(
        { error: 'DICOM conversion not yet implemented. Please upload an image file for AI analysis.' },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image available for analysis' },
        { status: 400 }
      );
    }

    // Fetch image for GPT-4 Vision
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';

    // Analyze with GPT-4 Vision
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are a dental radiologist AI assistant. Analyze dental X-ray images and provide:
1. Detailed findings (caries, periodontal issues, restorations, missing teeth, etc.)
2. Tooth-by-tooth analysis if applicable
3. Recommendations for treatment
4. Confidence level in your analysis

Be specific about tooth numbers using Universal Numbering System (1-32).`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this ${xray.xrayType} X-ray taken on ${new Date(xray.dateTaken).toLocaleDateString()}. 
${xray.teethIncluded.length > 0 ? `Teeth included: ${xray.teethIncluded.join(', ')}` : ''}
${xray.notes ? `Notes: ${xray.notes}` : ''}

Provide a comprehensive analysis including findings, recommendations, and confidence level.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const analysisText = completion.choices[0]?.message?.content || '';

    // Parse analysis into structured format
    const aiAnalysis = {
      findings: analysisText,
      confidence: 0.85, // GPT-4 Vision doesn't provide confidence, using default
      recommendations: extractRecommendations(analysisText),
      model: 'gpt-4-vision-preview',
      analyzedAt: new Date().toISOString(),
    };

    // Update X-ray with analysis
    const updatedXray = await (prisma as any).dentalXRay.update({
      where: { id: params.id },
      data: {
        aiAnalysis,
        aiAnalyzedAt: new Date(),
        aiModel: 'gpt-4-vision-preview',
      },
    });

    return NextResponse.json({
      success: true,
      xray: updatedXray,
      analysis: aiAnalysis,
    });
  } catch (error: any) {
    console.error('Error analyzing X-ray:', error);
    return NextResponse.json(
      { error: 'Failed to analyze X-ray: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

// Helper function to extract recommendations from analysis text
function extractRecommendations(text: string): string {
  // Simple extraction - look for recommendation patterns
  const recommendationPatterns = [
    /recommendations?:?\s*(.+?)(?:\n\n|$)/i,
    /recommended:?\s*(.+?)(?:\n\n|$)/i,
    /suggest:?\s*(.+?)(?:\n\n|$)/i,
  ];

  for (const pattern of recommendationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // If no specific recommendations found, return empty
  return '';
}
