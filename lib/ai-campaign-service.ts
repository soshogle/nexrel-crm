/**
 * AI Campaign Content Generation Service
 * Generates intelligent email and SMS content for marketing campaigns
 */

import { prisma } from '@/lib/db';
import { chatCompletion } from '@/lib/openai-client';

interface CampaignGenerationContext {
  campaignType: 'EMAIL' | 'SMS' | 'VOICE_CALL' | 'MULTI_CHANNEL';
  goal: string; // e.g., "promote holiday sale to restaurant leads"
  targetAudience?: any;
  businessContext?: {
    businessName?: string;
    industry?: string | null;
    tone?: string;
  };
  includePersonalization?: boolean;
  userLanguage?: string; // User's language preference (en, fr, es, zh)
}

interface GeneratedContent {
  subject: string;
  body: string;
  html?: string;
  smsText?: string;
  confidence: number;
  suggestions: string[];
}

export class AICampaignService {
  /**
   * Generate email subject lines based on campaign goal
   */
  async generateEmailSubjects(context: CampaignGenerationContext): Promise<string[]> {
    const { goal, businessContext } = context;
    const tone = businessContext?.tone || 'professional';
    const industry = businessContext?.industry;

    // AI-powered subject line generation based on best practices
    const subjectLines: string[] = [];

    // Personalization-focused subjects
    if (context.includePersonalization) {
      subjectLines.push(
        `{firstName}, we have something special for you`,
        `Exclusive offer for {firstName} at {businessName}`,
        `{firstName}, don't miss this opportunity`
      );
    }

    // Urgency-based subjects
    if (tone === 'urgent') {
      subjectLines.push(
        `⏰ Last chance: ${goal}`,
        `Only 24 hours left!`,
        `Final reminder: ${goal}`
      );
    }

    // Value-proposition subjects
    subjectLines.push(
      `${goal} - Limited time offer`,
      `Exclusive: ${goal}`,
      `You're invited: ${goal}`
    );

    // Industry-specific subjects
    if (industry === 'RESTAURANT') {
      subjectLines.push(
        `🍽️ New menu items you'll love`,
        `Your favorite restaurant has news`,
        `Reserve your table for ${goal}`
      );
    } else if (industry === 'SPORTS_CLUB') {
      subjectLines.push(
        `⚽ Registration now open: ${goal}`,
        `Join us this season`,
        `Early bird pricing for ${goal}`
      );
    }

    // Question-based subjects (high engagement)
    subjectLines.push(
      `Ready for ${goal}?`,
      `Have you heard about ${goal}?`,
      `When can we see you again?`
    );

    return subjectLines.slice(0, 5); // Return top 5
  }

  /**
   * Generate complete email content
   */
  async generateEmailContent(context: CampaignGenerationContext): Promise<GeneratedContent> {
    const { goal, businessContext, targetAudience, userLanguage = 'en' } = context;
    const tone = businessContext?.tone || 'professional';
    const businessName = businessContext?.businessName || 'our team';
    
    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST generate content ONLY in English. Every single word must be in English.',
      'fr': 'CRITIQUE : Vous DEVEZ générer du contenu UNIQUEMENT en français. Chaque mot doit être en français.',
      'es': 'CRÍTICO: DEBES generar contenido SOLO en español. Cada palabra debe estar en español.',
      'zh': '关键：您必须仅用中文生成内容。每个词都必须是中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    // Generate subject lines using AI
    const subjects = await this.generateEmailSubjects(context);
    const subject = subjects[0];

    // Generate email body using AI with language instruction
    const emailPrompt = `${languageInstruction}

Generate a professional email campaign message with the following details:

Campaign Goal: ${goal}
Business Name: ${businessName}
Industry: ${businessContext?.industry || 'General'}
Tone: ${tone}
${context.includePersonalization ? 'Include personalization placeholders like {firstName}' : ''}

Generate a complete email body that:
1. Has an engaging opening/greeting
2. Clearly communicates the campaign goal
3. Includes a value proposition
4. Has a clear call-to-action
5. Has a professional closing

Return ONLY the email body text, no subject line. Use placeholders like {firstName} and {businessName} where appropriate.`;

    try {
      const aiResponse = await chatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email marketing copywriter. Generate professional, engaging email content.'
          },
          {
            role: 'user',
            content: emailPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const body = aiResponse.choices?.[0]?.message?.content || `${goal}\n\nAs a valued member of our community, we wanted to make sure you didn't miss this opportunity.`;
      
      // Generate HTML version
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #8b5cf6;">${subject.replace('{businessName}', businessName).replace('{firstName}', 'there')}</h2>
          ${body.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
      `;

      // Generate suggestions
      const suggestions = [
        'Consider A/B testing different subject lines',
        'Add a clear call-to-action button',
        'Include social proof or testimonials',
        'Personalize with recipient name and preferences',
        'Optimize send time for your audience'
      ];

      return {
        subject,
        body,
        html,
        confidence: 0.85,
        suggestions
      };
    } catch (error) {
      console.error('Error generating email content:', error);
      // Fallback to simple template
      const fallbackBody = `${goal}\n\nAs a valued member of our community, we wanted to make sure you didn't miss this opportunity.`;
      return {
        subject: subjects[0] || goal,
        body: fallbackBody,
        html: `<div><p>${fallbackBody}</p></div>`,
        confidence: 0.7,
        suggestions: []
      };
    }
  }

  /**
   * Generate SMS content (160 character optimized)
   */
  async generateSMSContent(context: CampaignGenerationContext): Promise<GeneratedContent> {
    const { goal, businessContext, userLanguage = 'en' } = context;
    const businessName = businessContext?.businessName || 'Us';
    
    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST generate SMS content ONLY in English. Every single word must be in English. Keep it under 160 characters.',
      'fr': 'CRITIQUE : Vous DEVEZ générer le contenu SMS UNIQUEMENT en français. Chaque mot doit être en français. Gardez-le sous 160 caractères.',
      'es': 'CRÍTICO: DEBES generar el contenido SMS SOLO en español. Cada palabra debe estar en español. Manténlo bajo 160 caracteres.',
      'zh': '关键：您必须仅用中文生成短信内容。每个词都必须是中文。保持在160个字符以内。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    // Generate SMS using AI
    const smsPrompt = `${languageInstruction}

Generate a concise SMS campaign message (under 160 characters) with:

Campaign Goal: ${goal}
Business Name: ${businessName}
${context.includePersonalization ? 'Include {firstName} placeholder' : ''}

The SMS should be engaging, include a clear call-to-action, and stay under 160 characters.`;

    let smsText = '';
    try {
      const aiResponse = await chatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SMS marketer. Generate concise, engaging SMS messages under 160 characters.'
          },
          {
            role: 'user',
            content: smsPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      smsText = aiResponse.choices?.[0]?.message?.content?.trim() || '';
      
      // Ensure under 160 chars
      if (smsText.length > 160) {
        smsText = smsText.substring(0, 157) + '...';
      }
    } catch (error) {
      // Fallback to simple template
      if (context.includePersonalization) {
        smsText = `Hi {firstName}! `;
      } else {
        smsText = `Hello! `;
      }
      const coreMessage = goal.length > 100 ? goal.substring(0, 100) + '...' : goal;
      smsText += `${coreMessage} `;
      smsText += `Reply YES for details. -${businessName}`;
      if (smsText.length > 160) {
        smsText = smsText.substring(0, 157) + '...';
      }
    }

    const suggestions = [
      'Keep it under 160 characters',
      'Include a clear call to action',
      'Use link shorteners for URLs',
      'Avoid special characters that use multiple SMS units'
    ];

    return {
      subject: '', // SMS doesn't have subject
      body: smsText,
      smsText,
      confidence: 0.82,
      suggestions
    };
  }

  /**
   * Generate voice call script for voice campaigns
   */
  async generateVoiceCallScript(context: CampaignGenerationContext): Promise<GeneratedContent> {
    const { goal, businessContext, targetAudience, userLanguage = 'en' } = context;
    const tone = businessContext?.tone || 'professional';
    const businessName = businessContext?.businessName || 'our company';
    const industry = businessContext?.industry;
    
    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST generate voice call script ONLY in English. Every single word must be in English.',
      'fr': 'CRITIQUE : Vous DEVEZ générer le script d\'appel vocal UNIQUEMENT en français. Chaque mot doit être en français.',
      'es': 'CRÍTICO: DEBES generar el guion de llamada de voz SOLO en español. Cada palabra debe estar en español.',
      'zh': '关键：您必须仅用中文生成语音通话脚本。每个词都必须是中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    // Generate voice call script using AI
    const voicePrompt = `${languageInstruction}

Generate a conversational voice call script for a phone campaign with:

Campaign Goal: ${goal}
Business Name: ${businessName}
Industry: ${industry || 'General'}
Tone: ${tone}
${context.includePersonalization ? 'Include {firstName} placeholder' : ''}

Generate a complete call script with:
1. Opening/Introduction
2. Purpose/Hook
3. Value Proposition
4. Call to Action
5. Response Handling (for interested, not interested, voicemail)
6. Closing

Format it clearly with section labels.`;

    let callScript = '';
    try {
      const aiResponse = await chatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert phone sales script writer. Generate natural, conversational call scripts.'
          },
          {
            role: 'user',
            content: voicePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      callScript = aiResponse.choices?.[0]?.message?.content?.trim() || '';
    } catch (error) {
      // Fallback to template
      callScript = `OPENING:\n"Hello! This is a message from ${businessName}. `;
      if (context.includePersonalization) {
        callScript += `Am I speaking with {firstName}? `;
      }
      callScript += `We wanted to reach out about an important opportunity."\n\n`;
      callScript += `PURPOSE:\n"${goal}"\n\n`;
      callScript += `CALL TO ACTION:\n"Would you be interested in learning more?"\n\n`;
      callScript += `CLOSING:\n"Thank you for your time today. Have a great day!"\n`;
    }

    // Generate suggestions
    const suggestions = [
      'Keep calls under 2 minutes for best engagement',
      'Use a natural, conversational tone',
      'Train voice agent to handle common objections',
      'Include opt-out option for compliance',
      'Test with different voice tones and pacing',
      'Schedule calls during optimal hours (10 AM - 8 PM)'
    ];

    return {
      subject: 'Voice Call Campaign',
      body: callScript,
      confidence: 0.80,
      suggestions
    };
  }

  /**
   * Auto-categorize campaign based on content
   */
  async categorizeCampaign(campaignName: string, description?: string): Promise<{
    suggestedType: 'EMAIL' | 'SMS' | 'VOICE_CALL' | 'MULTI_CHANNEL';
    suggestedGoal: string;
    confidence: number;
  }> {
    const text = `${campaignName} ${description || ''}`.toLowerCase();

    // Keyword analysis
    const emailKeywords = ['newsletter', 'announcement', 'detailed', 'long-form', 'article'];
    const smsKeywords = ['quick', 'reminder', 'urgent', 'flash', 'now', 'today'];
    const voiceKeywords = ['call', 'phone', 'voice', 'outreach', 'contact', 'speak', 'talk'];

    const hasEmailKeywords = emailKeywords.some(kw => text.includes(kw));
    const hasSMSKeywords = smsKeywords.some(kw => text.includes(kw));
    const hasVoiceKeywords = voiceKeywords.some(kw => text.includes(kw));

    let suggestedType: 'EMAIL' | 'SMS' | 'VOICE_CALL' | 'MULTI_CHANNEL';
    const keywordCount = [hasEmailKeywords, hasSMSKeywords, hasVoiceKeywords].filter(Boolean).length;
    
    if (keywordCount >= 2) {
      suggestedType = 'MULTI_CHANNEL';
    } else if (hasVoiceKeywords) {
      suggestedType = 'VOICE_CALL';
    } else if (hasSMSKeywords) {
      suggestedType = 'SMS';
    } else {
      suggestedType = 'EMAIL';
    }

    return {
      suggestedType,
      suggestedGoal: campaignName,
      confidence: 0.75
    };
  }

  /**
   * Suggest optimal send time based on audience
   */
  async suggestSendTime(userId: string, campaignType: 'EMAIL' | 'SMS' | 'VOICE_CALL'): Promise<{
    recommendedTime: Date;
    reason: string;
  }> {
    // Analyze historical engagement data
    const now = new Date();
    const recommendedTime = new Date(now);

    // Default recommendations
    if (campaignType === 'EMAIL') {
      // Best email open rates: Tuesday-Thursday, 10 AM
      const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
      recommendedTime.setDate(now.getDate() + daysUntilTuesday);
      recommendedTime.setHours(10, 0, 0, 0);
      return {
        recommendedTime,
        reason: 'Tuesday at 10 AM typically has highest email open rates'
      };
    } else if (campaignType === 'VOICE_CALL') {
      // Voice calls: Wednesday-Thursday, 11 AM - 1 PM or 4 PM - 6 PM (avoid meal times)
      const daysUntilWednesday = (3 - now.getDay() + 7) % 7 || 7;
      recommendedTime.setDate(now.getDate() + daysUntilWednesday);
      recommendedTime.setHours(11, 0, 0, 0);
      return {
        recommendedTime,
        reason: 'Wednesday mornings (11 AM - 1 PM) have highest call answer rates and avoid meal times'
      };
    } else {
      // SMS: Weekday afternoons 2-4 PM
      if (now.getDay() === 0 || now.getDay() === 6) {
        recommendedTime.setDate(now.getDate() + (8 - now.getDay()));
      }
      recommendedTime.setHours(14, 0, 0, 0);
      return {
        recommendedTime,
        reason: 'Weekday afternoons have highest SMS response rates'
      };
    }
  }

  /**
   * Predict campaign performance
   */
  async predictPerformance(campaign: {
    type: string;
    targetAudience: any;
    content: string;
  }): Promise<{
    expectedOpenRate: number;
    expectedClickRate: number;
    expectedConversions: number;
    confidence: number;
    insights: string[];
  }> {
    // Industry benchmarks
    const emailBenchmarks = {
      openRate: 0.21, // 21%
      clickRate: 0.027 // 2.7%
    };

    const smsBenchmarks = {
      openRate: 0.98, // 98%
      clickRate: 0.19 // 19%
    };

    const voiceBenchmarks = {
      openRate: 0.35, // 35% answer rate (treating as "open rate")
      clickRate: 0.15 // 15% conversion rate (treating as "click rate")
    };

    let benchmarks = emailBenchmarks;
    if (campaign.type === 'SMS') {
      benchmarks = smsBenchmarks;
    } else if (campaign.type === 'VOICE_CALL') {
      benchmarks = voiceBenchmarks;
    }

    // Adjust based on content quality
    const contentLength = campaign.content.length;
    const hasPersonalization = campaign.content.includes('{firstName}');
    const hasCTA = /call|click|visit|reply/i.test(campaign.content);

    let openRateMultiplier = 1.0;
    let clickRateMultiplier = 1.0;

    if (hasPersonalization) {
      openRateMultiplier += 0.15;
      clickRateMultiplier += 0.10;
    }

    if (hasCTA) {
      clickRateMultiplier += 0.20;
    }

    if (campaign.type === 'EMAIL' && (contentLength < 500 || contentLength > 2000)) {
      openRateMultiplier -= 0.10; // Penalize very short or very long emails
    }

    const insights = [];
    if (!hasPersonalization) {
      insights.push('Add personalization to increase open rates by 15%');
    }
    if (!hasCTA) {
      insights.push('Include a clear call-to-action to improve click rates');
    }
    if (campaign.type === 'EMAIL' && contentLength > 2000) {
      insights.push('Consider shortening content - long emails see lower engagement');
    }

    return {
      expectedOpenRate: Math.min(benchmarks.openRate * openRateMultiplier, 0.95),
      expectedClickRate: Math.min(benchmarks.clickRate * clickRateMultiplier, 0.50),
      expectedConversions: 0, // Would need more data
      confidence: 0.70,
      insights
    };
  }
}

export const aiCampaignService = new AICampaignService();
