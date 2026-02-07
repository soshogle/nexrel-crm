/**
 * X-Ray AI Analysis API
 * Analyzes X-ray images using GPT-4 Vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { DicomParser } from '@/lib/dental/dicom-parser';
import { DicomToImageConverter } from '@/lib/dental/dicom-to-image';
import OpenAI from 'openai';
import { t } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy initialization - only create client when actually needed
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

// POST /api/dental/xrays/[id]/analyze - Analyze X-ray with AI
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    // Get user's language preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    });
    const userLanguage = user?.language || 'en';

    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST generate the analysis ONLY in English. Every single word must be in English.',
      'fr': 'CRITIQUE : Vous DEVEZ générer l\'analyse UNIQUEMENT en français. Chaque mot doit être en français.',
      'es': 'CRÍTICO: DEBES generar el análisis SOLO en español. Cada palabra debe estar en español.',
      'zh': '关键：您必须仅用中文生成分析。每个词都必须是中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

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
        { error: await t('api.notFound') },
        { status: 404 }
      );
    }

    // Get image URL for analysis
    // For now, use the stored imageUrl or generate download URL
    let imageUrl: string | null = null;
    let isBase64 = false;
    
    if (xray.imageUrl) {
      imageUrl = xray.imageUrl;
    } else if (xray.imageFile) {
      // Generate download URL from API endpoint
      imageUrl = `/api/dental/xrays/${xray.id}/image`;
    } else if (xray.dicomFile) {
      // Convert DICOM to image for analysis
      try {
        const storageService = new CanadianStorageService();
        // Note: Encryption key retrieval would need to be implemented
        // For now, we'll try to download without decryption if possible
        // In production, store encryption key ID with X-ray record
        
        // TODO: Retrieve encryption key from database
        // For now, we'll need to handle this differently
        // This is a placeholder - actual implementation would retrieve the key
        const encryptionKey = ''; // Would come from database
        
        // Download DICOM file from storage
        const dicomBuffer = await storageService.downloadDocument(
          xray.dicomFile,
          encryptionKey
        );
        
        // Parse DICOM and extract pixel data
        const { pixelData } = DicomParser.parseDicom(dicomBuffer);
        
        // Get optimal window/level for this X-ray type
        const optimalWindow = DicomToImageConverter.getOptimalWindowLevel(xray.xrayType);
        
        // Convert to image
        const imageBuffer = await DicomToImageConverter.convertToImage(pixelData, {
          windowCenter: optimalWindow.windowCenter,
          windowWidth: optimalWindow.windowWidth,
          outputFormat: 'png',
          maxDimension: 2048,
        });
        
        // Convert to base64 for GPT-4 Vision
        const base64Image = imageBuffer.toString('base64');
        const mimeType = 'image/png';
        
        // Use base64 image directly
        imageUrl = `data:${mimeType};base64,${base64Image}`;
        isBase64 = true;
      } catch (dicomError) {
        console.error('Error converting DICOM for analysis:', dicomError);
        return NextResponse.json(
          { error: await t('api.dicomConversionFailed') + ': ' + (dicomError as Error).message },
          { status: 400 }
        );
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: await t('api.missingRequiredFields') },
        { status: 400 }
      );
    }

    // Fetch image for GPT-4 Vision (if not already base64)
    let base64Image: string;
    let mimeType: string;
    
    if (isBase64 || imageUrl.startsWith('data:')) {
      // Already base64 (from DICOM conversion)
      const parts = imageUrl.split(',');
      mimeType = parts[0].split(':')[1].split(';')[0];
      base64Image = parts[1];
    } else {
      // Fetch from URL
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      base64Image = Buffer.from(imageBuffer).toString('base64');
      mimeType = imageResponse.headers.get('content-type') || 'image/png';
    }

    // Analyze with GPT-4 Vision
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `${languageInstruction}

You are a dental radiologist AI assistant. Analyze dental X-ray images and provide:
1. Detailed findings (caries, periodontal issues, restorations, missing teeth, etc.)
2. Tooth-by-tooth analysis if applicable
3. Recommendations for treatment
4. Confidence level in your analysis

IMPORTANT DISCLAIMER: Your analysis is for information purposes only. It is NOT for diagnostic use. It requires professional interpretation and is NOT a substitute for professional judgment. Always emphasize that a licensed dental professional must review and interpret all findings.

Be specific about tooth numbers using Universal Numbering System (1-32).

${userLanguage === 'fr' ? 'Générez l\'analyse complète en français professionnel.' : ''}
${userLanguage === 'es' ? 'Genera el análisis completo en español profesional.' : ''}
${userLanguage === 'zh' ? '用专业中文生成完整分析。' : ''}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${languageInstruction}

Analyze this ${xray.xrayType} X-ray taken on ${new Date(xray.dateTaken).toLocaleDateString()}. 
${xray.teethIncluded.length > 0 ? `Teeth included: ${xray.teethIncluded.join(', ')}` : ''}
${xray.notes ? `Notes: ${xray.notes}` : ''}

Provide a comprehensive analysis including findings, recommendations, and confidence level. Generate the entire response in ${userLanguage === 'en' ? 'English' : userLanguage === 'fr' ? 'French' : userLanguage === 'es' ? 'Spanish' : 'Chinese'}.`,
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
      disclaimer: 'AI analysis is for information purposes only. Not for diagnostic use. Requires professional interpretation. Not a substitute for professional judgment.',
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
      { error: await t('api.analyzeXrayFailed') + ': ' + (error.message || 'Unknown error') },
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
