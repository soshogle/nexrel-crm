import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiCampaignService } from '@/lib/ai-campaign-service';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/campaigns/ai-generate - Generate AI campaign content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignType, goal, targetAudience, tone, includePersonalization } = body;

    // Validation
    if (!campaignType || !['EMAIL', 'SMS', 'VOICE_CALL', 'MULTI_CHANNEL'].includes(campaignType)) {
      return NextResponse.json(
        { error: 'Valid campaign type is required (EMAIL, SMS, VOICE_CALL, or MULTI_CHANNEL)' },
        { status: 400 }
      );
    }

    if (!goal) {
      return NextResponse.json(
        { error: 'Campaign goal is required' },
        { status: 400 }
      );
    }

    // Get user's business context and language preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        industry: true,
        language: true,
      },
    });

    const userLanguage = user?.language || 'en';
    
    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST generate content ONLY in English. Every single word must be in English.',
      'fr': 'CRITIQUE : Vous DEVEZ générer du contenu UNIQUEMENT en français. Chaque mot doit être en français.',
      'es': 'CRÍTICO: DEBES generar contenido SOLO en español. Cada palabra debe estar en español.',
      'zh': '关键：您必须仅用中文生成内容。每个词都必须是中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    const context = {
      campaignType,
      goal,
      targetAudience,
      businessContext: {
        businessName: user?.name || 'Our Business',
        industry: user?.industry,
        tone: tone || 'professional',
      },
      includePersonalization: includePersonalization !== false,
      userLanguage: userLanguage,
    };

    let generatedContent: any = {};

    // Generate content based on type
    if (campaignType === 'EMAIL' || campaignType === 'MULTI_CHANNEL') {
      const emailContent = await aiCampaignService.generateEmailContent(context);
      generatedContent.email = emailContent;
      generatedContent.emailSubjects = await aiCampaignService.generateEmailSubjects(context);
    }

    if (campaignType === 'SMS' || campaignType === 'MULTI_CHANNEL') {
      const smsContent = await aiCampaignService.generateSMSContent(context);
      generatedContent.sms = smsContent;
    }

    if (campaignType === 'VOICE_CALL' || campaignType === 'MULTI_CHANNEL') {
      const voiceContent = await aiCampaignService.generateVoiceCallScript(context);
      generatedContent.voice = voiceContent;
    }

    // Get send time recommendation
    const sendTimeRecommendation = await aiCampaignService.suggestSendTime(
      session.user.id,
      campaignType === 'MULTI_CHANNEL' ? 'EMAIL' : campaignType as any
    );

    // Predict performance
    const testContent = campaignType === 'EMAIL'
      ? generatedContent.email?.body
      : campaignType === 'VOICE_CALL'
      ? generatedContent.voice?.body
      : generatedContent.sms?.smsText;

    const performancePrediction = await aiCampaignService.predictPerformance({
      type: campaignType,
      targetAudience,
      content: testContent || '',
    });

    return NextResponse.json({
      generated: generatedContent,
      recommendations: {
        sendTime: sendTimeRecommendation,
        performance: performancePrediction,
      },
    });
  } catch (error: any) {
    console.error('Error generating AI content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
