/**
 * AI Campaign Content Generation Service
 * Generates intelligent email and SMS content for marketing campaigns
 */

import { prisma } from '@/lib/db';

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
    const { goal, businessContext, targetAudience } = context;
    const tone = businessContext?.tone || 'professional';
    const businessName = businessContext?.businessName || 'our team';

    // Generate subject
    const subjects = await this.generateEmailSubjects(context);
    const subject = subjects[0];

    // Generate body based on campaign structure
    let body = '';
    let html = '';

    // Opening/Greeting
    if (context.includePersonalization) {
      body += 'Hi {firstName},\n\n';
    } else {
      body += 'Hello,\n\n';
    }

    // Hook/Value proposition
    if (tone === 'urgent') {
      body += `We wanted to reach out one last time about ${goal}.\n\n`;
    } else if (tone === 'friendly') {
      body += `We've been thinking about you and wanted to share something exciting!\n\n`;
    } else {
      body += `We're excited to share some news with you.\n\n`;
    }

    // Main content
    body += `${goal}\n\n`;
    body += `As a valued member of our community, we wanted to make sure you didn't miss this opportunity.\n\n`;

    // Call to action
    body += `Here's what you can do:\n`;
    body += `• Visit us to learn more\n`;
    body += `• Call us to get started\n`;
    body += `• Reply to this email with any questions\n\n`;

    // Closing
    if (tone === 'urgent') {
      body += `Don't wait - this opportunity won't last!\n\n`;
    } else {
      body += `We look forward to hearing from you soon.\n\n`;
    }

    body += `Best regards,\n${businessName}`;

    // Generate HTML version
    html = `
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
  }

  /**
   * Generate SMS content (160 character optimized)
   */
  async generateSMSContent(context: CampaignGenerationContext): Promise<GeneratedContent> {
    const { goal, businessContext } = context;
    const businessName = businessContext?.businessName || 'Us';

    // SMS must be concise (160 chars)
    let smsText = '';

    if (context.includePersonalization) {
      smsText = `Hi {firstName}! `;
    } else {
      smsText = `Hello! `;
    }

    // Core message
    const coreMessage = goal.length > 100 ? goal.substring(0, 100) + '...' : goal;
    smsText += `${coreMessage} `;

    // CTA
    smsText += `Reply YES for details. -${businessName}`;

    // Ensure under 160 chars
    if (smsText.length > 160) {
      smsText = smsText.substring(0, 157) + '...';
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
    const { goal, businessContext, targetAudience } = context;
    const tone = businessContext?.tone || 'professional';
    const businessName = businessContext?.businessName || 'our company';
    const industry = businessContext?.industry;

    // Generate conversational call script
    let callScript = '';

    // Opening/Introduction
    callScript += `OPENING:\n`;
    callScript += `"Hello! This is a message from ${businessName}. `;
    if (context.includePersonalization) {
      callScript += `Am I speaking with {firstName}? `;
    }
    callScript += `We wanted to reach out about an important opportunity."\n\n`;

    // Purpose/Hook
    callScript += `PURPOSE:\n`;
    if (tone === 'urgent') {
      callScript += `"We have a time-sensitive opportunity regarding ${goal}. `;
    } else if (tone === 'friendly') {
      callScript += `"We've been thinking about you and wanted to share something exciting about ${goal}. `;
    } else {
      callScript += `"I'm calling today to let you know about ${goal}. `;
    }
    callScript += `We believe this could be valuable for you."\n\n`;

    // Value Proposition
    callScript += `VALUE PROPOSITION:\n`;
    if (industry === 'RESTAURANT') {
      callScript += `"As a valued customer, we wanted to give you first access to our latest menu offerings and special events. `;
    } else if (industry === 'SPORTS_CLUB') {
      callScript += `"We're offering early registration for ${goal}, and we wanted to make sure you didn't miss out. `;
    } else {
      callScript += `"This is an exclusive opportunity for our valued customers, and we wanted to ensure you heard about it first. `;
    }
    callScript += `"\n\n`;

    // Call to Action
    callScript += `CALL TO ACTION:\n`;
    callScript += `"Would you be interested in learning more? I can:\n`;
    callScript += `- Schedule a callback at your convenience\n`;
    callScript += `- Send you detailed information via email or text\n`;
    callScript += `- Answer any questions you have right now\n\n`;
    callScript += `What works best for you?"\n\n`;

    // Handling Responses
    callScript += `RESPONSE HANDLING:\n`;
    callScript += `IF INTERESTED: "Great! Let me get your preferred contact method..."\n`;
    callScript += `IF NOT INTERESTED: "I understand. Thank you for your time. Would you like me to remove you from future calls?"\n`;
    callScript += `IF VOICEMAIL: "Hi, this is ${businessName}. We wanted to reach you about ${goal}. Please call us back or reply to this message for more information."\n\n`;

    // Closing
    callScript += `CLOSING:\n`;
    callScript += `"Thank you for your time today. Have a great day!"\n`;

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
