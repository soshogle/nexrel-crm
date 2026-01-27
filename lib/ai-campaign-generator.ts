/**
 * AI Campaign Generator Service
 * 
 * Uses Abacus AI to generate and optimize marketing campaigns
 * - Email campaign generation from natural language
 * - SMS campaign generation from natural language
 * - Subject line A/B test variants
 * - Content optimization and rewriting
 * - Smart recipient segmentation
 * - Send time recommendations
 */

interface CampaignGoal {
  description: string;
  campaignType: 'email' | 'sms';
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'urgent' | 'persuasive';
  goal?: 'sales' | 'engagement' | 'announcement' | 'nurture' | 'event';
  businessContext?: string;
  brandVoice?: string;
  constraints?: {
    maxLength?: number;
    includeEmojis?: boolean;
    includeLinks?: boolean;
    callToAction?: string;
  };
}

interface EmailCampaignResult {
  name: string;
  subject: string;
  subjectVariants: string[];
  previewText: string;
  htmlContent: string;
  textContent: string;
  fromName: string;
  fromEmail: string;
  recommendations: {
    bestSendTime: string;
    segmentationSuggestions: string[];
    personalizationTips: string[];
    abTestIdeas: string[];
  };
}

interface SmsCampaignResult {
  name: string;
  message: string;
  messageVariants: string[];
  estimatedSegments: number;
  recommendations: {
    bestSendTime: string;
    segmentationSuggestions: string[];
    personalizationTips: string[];
    abTestIdeas: string[];
  };
}

interface OptimizationResult {
  optimizedContent: string;
  improvements: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  readabilityScore: number;
  suggestions: string[];
}

interface RecipientSegment {
  name: string;
  criteria: string;
  estimatedSize: number;
  engagementLikelihood: 'high' | 'medium' | 'low';
  reasoning: string;
}

export class AiCampaignGeneratorService {
  private apiKey: string;
  private apiEndpoint: string;

  constructor() {
    this.apiKey = process.env.ABACUSAI_API_KEY || '';
    this.apiEndpoint = process.env.ABACUSAI_API_ENDPOINT || 'https://api.abacus.ai/v1/chat/completions';
  }

  /**
   * Generate a complete email campaign from natural language description
   */
  async generateEmailCampaign(goal: CampaignGoal): Promise<EmailCampaignResult> {
    const prompt = this.buildEmailCampaignPrompt(goal);
    const response = await this.callAI(prompt);
    return this.parseEmailCampaignResponse(response);
  }

  /**
   * Generate a complete SMS campaign from natural language description
   */
  async generateSmsCampaign(goal: CampaignGoal): Promise<SmsCampaignResult> {
    const prompt = this.buildSmsCampaignPrompt(goal);
    const response = await this.callAI(prompt);
    return this.parseSmsCampaignResponse(response);
  }

  /**
   * Generate multiple subject line variants for A/B testing
   */
  async generateSubjectVariants(
    originalSubject: string,
    count: number = 5,
    tone?: string
  ): Promise<string[]> {
    const prompt = `Generate ${count} alternative subject lines for an email campaign. 
    
Original subject: "${originalSubject}"
Tone: ${tone || 'professional'}

Requirements:
- Each variant should be unique and compelling
- Test different approaches (question, urgency, curiosity, benefit-focused)
- Keep under 60 characters for mobile optimization
- Avoid spam trigger words
- Focus on clarity and value

Return ONLY a JSON array of strings, no other text:
["Subject 1", "Subject 2", ...]`;

    const response = await this.callAI(prompt);
    return this.parseSubjectVariants(response);
  }

  /**
   * Optimize existing campaign content
   */
  async optimizeContent(
    content: string,
    contentType: 'email' | 'sms',
    optimizationGoals: string[]
  ): Promise<OptimizationResult> {
    const prompt = `Optimize this ${contentType} campaign content:

Content:
${content}

Optimization Goals:
${optimizationGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Provide:
1. Optimized version of the content
2. List of specific improvements made
3. Sentiment analysis (positive/neutral/negative)
4. Readability score (0-100)
5. Additional suggestions for improvement

Return response as JSON in this exact format:
{
  "optimizedContent": "...",
  "improvements": ["...", "..."],
  "sentiment": "positive|neutral|negative",
  "readabilityScore": 85,
  "suggestions": ["...", "..."]
}`;

    const response = await this.callAI(prompt);
    return this.parseOptimizationResult(response);
  }

  /**
   * Suggest recipient segments based on campaign goal and available data
   */
  async suggestRecipientSegments(
    campaignGoal: string,
    availableLeadData: any[]
  ): Promise<RecipientSegment[]> {
    const leadSummary = this.summarizeLeadData(availableLeadData);
    
    const prompt = `Suggest smart recipient segments for this campaign:

Campaign Goal: ${campaignGoal}

Available Lead Data Summary:
${leadSummary}

Suggest 3-5 recipient segments that would be most effective for this campaign.
For each segment provide:
- Segment name
- Criteria for selection
- Estimated size
- Engagement likelihood (high/medium/low)
- Reasoning

Return response as JSON array:
[
  {
    "name": "Segment Name",
    "criteria": "Description of who fits this segment",
    "estimatedSize": 50,
    "engagementLikelihood": "high",
    "reasoning": "Why this segment will engage"
  }
]`;

    const response = await this.callAI(prompt);
    return this.parseRecipientSegments(response);
  }

  /**
   * Recommend optimal send time based on campaign type and audience
   */
  async recommendSendTime(
    campaignType: 'email' | 'sms',
    targetAudience: string,
    campaignGoal: string
  ): Promise<{
    recommendedTime: string;
    reasoning: string;
    alternatives: string[];
  }> {
    const prompt = `Recommend the optimal send time for this campaign:

Campaign Type: ${campaignType}
Target Audience: ${targetAudience}
Campaign Goal: ${campaignGoal}

Consider:
- Industry best practices
- Audience behavior patterns
- Campaign type characteristics
- Time zone considerations

Return response as JSON:
{
  "recommendedTime": "Day HH:MM AM/PM format",
  "reasoning": "Explanation of why this time is optimal",
  "alternatives": ["Alternative 1", "Alternative 2"]
}`;

    const response = await this.callAI(prompt);
    return JSON.parse(this.extractJSON(response));
  }

  /**
   * Build prompt for email campaign generation
   */
  private buildEmailCampaignPrompt(goal: CampaignGoal): string {
    return `You are an expert email marketing copywriter. Generate a complete email campaign based on this description:

Campaign Description: ${goal.description}
Target Audience: ${goal.targetAudience || 'General audience'}
Tone: ${goal.tone || 'professional'}
Goal: ${goal.goal || 'engagement'}
Business Context: ${goal.businessContext || 'Not specified'}
Brand Voice: ${goal.brandVoice || 'Professional and friendly'}

Generate:
1. Campaign name (short, descriptive)
2. Main subject line (compelling, under 60 chars)
3. 4 subject line variants for A/B testing
4. Preview text (50-100 chars)
5. HTML email content (well-formatted, persuasive, includes CTA)
6. Plain text version
7. Recommended sender name
8. Recommended sender email format
9. Best send time with reasoning
10. 3 segmentation suggestions
11. 3 personalization tips
12. 3 A/B test ideas

Return response as JSON in this exact format:
{
  "name": "Campaign Name",
  "subject": "Main subject line",
  "subjectVariants": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"],
  "previewText": "Preview text...",
  "htmlContent": "<html>...</html>",
  "textContent": "Plain text version...",
  "fromName": "Company Name",
  "fromEmail": "hello@company.com",
  "recommendations": {
    "bestSendTime": "Tuesday 10:00 AM - Most opens happen mid-morning",
    "segmentationSuggestions": ["Segment 1", "Segment 2", "Segment 3"],
    "personalizationTips": ["Tip 1", "Tip 2", "Tip 3"],
    "abTestIdeas": ["Test 1", "Test 2", "Test 3"]
  }
}`;
  }

  /**
   * Build prompt for SMS campaign generation
   */
  private buildSmsCampaignPrompt(goal: CampaignGoal): string {
    const maxLength = goal.constraints?.maxLength || 160;
    const includeEmojis = goal.constraints?.includeEmojis !== false;
    
    return `You are an expert SMS marketing copywriter. Generate a complete SMS campaign based on this description:

Campaign Description: ${goal.description}
Target Audience: ${goal.targetAudience || 'General audience'}
Tone: ${goal.tone || 'friendly'}
Goal: ${goal.goal || 'engagement'}
Max Length: ${maxLength} characters
Include Emojis: ${includeEmojis ? 'Yes' : 'No'}
Call to Action: ${goal.constraints?.callToAction || 'Not specified'}

Generate:
1. Campaign name (short, descriptive)
2. Main SMS message (compelling, under ${maxLength} chars)
3. 4 message variants for A/B testing
4. Estimated number of SMS segments
5. Best send time with reasoning
6. 3 segmentation suggestions
7. 3 personalization tips
8. 3 A/B test ideas

Guidelines:
- Clear and concise
- Strong call-to-action
- Use {{name}} for personalization
- Include opt-out language if appropriate
- Mobile-optimized formatting

Return response as JSON in this exact format:
{
  "name": "Campaign Name",
  "message": "Main SMS message text",
  "messageVariants": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"],
  "estimatedSegments": 1,
  "recommendations": {
    "bestSendTime": "Tuesday 12:00 PM - Lunch break peak engagement",
    "segmentationSuggestions": ["Segment 1", "Segment 2", "Segment 3"],
    "personalizationTips": ["Tip 1", "Tip 2", "Tip 3"],
    "abTestIdeas": ["Test 1", "Test 2", "Test 3"]
  }
}`;
  }

  /**
   * Call the Abacus AI API
   */
  private async callAI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ABACUSAI_API_KEY not configured');
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert marketing campaign generator. Always return valid JSON responses in the exact format requested.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Parse email campaign response from AI
   */
  private parseEmailCampaignResponse(response: string): EmailCampaignResult {
    try {
      const jsonStr = this.extractJSON(response);
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!parsed.name || !parsed.subject || !parsed.htmlContent) {
        throw new Error('Missing required fields in AI response');
      }
      
      return parsed as EmailCampaignResult;
    } catch (error) {
      console.error('Error parsing email campaign response:', error);
      throw new Error('Failed to parse AI response for email campaign');
    }
  }

  /**
   * Parse SMS campaign response from AI
   */
  private parseSmsCampaignResponse(response: string): SmsCampaignResult {
    try {
      const jsonStr = this.extractJSON(response);
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!parsed.name || !parsed.message) {
        throw new Error('Missing required fields in AI response');
      }
      
      return parsed as SmsCampaignResult;
    } catch (error) {
      console.error('Error parsing SMS campaign response:', error);
      throw new Error('Failed to parse AI response for SMS campaign');
    }
  }

  /**
   * Parse subject line variants from AI response
   */
  private parseSubjectVariants(response: string): string[] {
    try {
      const jsonStr = this.extractJSON(response);
      const variants = JSON.parse(jsonStr);
      
      if (!Array.isArray(variants)) {
        throw new Error('Response is not an array');
      }
      
      return variants.filter((v) => typeof v === 'string' && v.length > 0);
    } catch (error) {
      console.error('Error parsing subject variants:', error);
      throw new Error('Failed to parse subject line variants');
    }
  }

  /**
   * Parse optimization result from AI response
   */
  private parseOptimizationResult(response: string): OptimizationResult {
    try {
      const jsonStr = this.extractJSON(response);
      return JSON.parse(jsonStr) as OptimizationResult;
    } catch (error) {
      console.error('Error parsing optimization result:', error);
      throw new Error('Failed to parse optimization result');
    }
  }

  /**
   * Parse recipient segments from AI response
   */
  private parseRecipientSegments(response: string): RecipientSegment[] {
    try {
      const jsonStr = this.extractJSON(response);
      return JSON.parse(jsonStr) as RecipientSegment[];
    } catch (error) {
      console.error('Error parsing recipient segments:', error);
      throw new Error('Failed to parse recipient segments');
    }
  }

  /**
   * Extract JSON from AI response (handles markdown code blocks)
   */
  private extractJSON(response: string): string {
    // Try to find JSON in markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find raw JSON
    const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    return response.trim();
  }

  /**
   * Summarize lead data for AI analysis
   */
  private summarizeLeadData(leads: any[]): string {
    const summary = {
      totalLeads: leads.length,
      withEmail: leads.filter((l) => l.email).length,
      withPhone: leads.filter((l) => l.phone).length,
      statusDistribution: {} as Record<string, number>,
      sampleData: leads.slice(0, 3).map((l) => ({
        businessName: l.businessName,
        status: l.status,
        hasEmail: !!l.email,
        hasPhone: !!l.phone,
      })),
    };

    // Count status distribution
    leads.forEach((lead) => {
      const status = lead.status || 'UNKNOWN';
      summary.statusDistribution[status] = (summary.statusDistribution[status] || 0) + 1;
    });

    return JSON.stringify(summary, null, 2);
  }
}

// Export singleton instance
export const aiCampaignGenerator = new AiCampaignGeneratorService();
