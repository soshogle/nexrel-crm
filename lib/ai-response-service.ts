
import { prisma } from './db';

interface MessageContext {
  conversationId: string;
  userId: string;
  incomingMessage: string;
  contactName: string;
  channelType: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

interface AIResponse {
  response: string;
  confidence: number;
  sentiment: string;
  intent: string;
  needsHumanReview: boolean;
  escalationReason?: string;
  detectedLanguage: string;
  keyTopics: string[];
  suggestedActions: string[];
}

export class AIResponseService {
  private apiKey: string;
  private apiUrl = 'https://apps.abacus.ai/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.ABACUSAI_API_KEY || '';
  }

  private ensureConfigured() {
    if (!this.apiKey) {
      throw new Error('ABACUSAI_API_KEY is not configured');
    }
  }

  /**
   * Generate AI response for incoming message
   */
  async generateResponse(context: MessageContext): Promise<AIResponse> {
    this.ensureConfigured();
    const { userId, incomingMessage, contactName, channelType, conversationHistory } = context;

    // Get user's auto-reply settings
    const settings = await prisma.autoReplySettings.findUnique({
      where: { userId },
    });

    if (!settings || !settings.isEnabled) {
      throw new Error('Auto-reply is not enabled for this user');
    }

    // Check business hours
    if (settings.businessHoursEnabled && !this.isWithinBusinessHours(settings)) {
      return this.createAfterHoursResponse(settings, incomingMessage);
    }

    // Get knowledge base
    const knowledgeBase = await prisma.knowledgeBase.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // Build context for AI
    const systemPrompt = this.buildSystemPrompt(settings, knowledgeBase);
    const messages = this.buildMessageHistory(
      systemPrompt,
      conversationHistory || [],
      incomingMessage,
      contactName
    );

    // Call AI API
    const aiResponse = await this.callAIAPI(messages, settings);

    // Analyze response and determine if human review is needed
    const analysis = await this.analyzeResponse(incomingMessage, aiResponse, settings);

    return {
      response: aiResponse,
      ...analysis,
    };
  }

  /**
   * Build system prompt with knowledge base
   */
  private buildSystemPrompt(
    settings: any,
    knowledgeBase: any[]
  ): string {
    const tone = settings.responseTone || 'professional';
    const language = settings.responseLanguage || 'en';
    
    let prompt = `You are an AI assistant for a business, responding to customer messages via ${settings.channelType || 'messaging'}.

IMPORTANT GUIDELINES:
- Response tone: ${tone}
- Language: ${language}
- Maximum response length: ${settings.maxResponseLength || 500} characters
- Be helpful, accurate, and ${tone}
- If you don't know something, admit it and suggest contacting a human representative
- Never make up information not in the knowledge base

KNOWLEDGE BASE:
`;

    // Add knowledge base entries
    if (knowledgeBase.length > 0) {
      knowledgeBase.forEach((entry, index) => {
        prompt += `\n${index + 1}. ${entry.title}${entry.category ? ` (${entry.category})` : ''}\n${entry.content}\n`;
      });
    } else {
      prompt += '\nNo specific knowledge base provided. Use general business communication best practices.\n';
    }

    prompt += `\n---

Your task is to respond to the customer's message naturally and helpfully based on the knowledge base above. Keep responses concise and relevant.`;

    return prompt;
  }

  /**
   * Build message history for context
   */
  private buildMessageHistory(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
    currentMessage: string,
    contactName: string
  ) {
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history (limited)
    const recentHistory = history.slice(-10); // Last 10 messages
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });

    // Add current message
    messages.push({
      role: 'user',
      content: `${contactName}: ${currentMessage}`,
    });

    return messages;
  }

  /**
   * Call AI API
   */
  private async callAIAPI(messages: any[], settings: any): Promise<string> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages,
          temperature: 0.7,
          max_tokens: Math.min(settings.maxResponseLength * 2, 1000),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('AI API call failed:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Analyze response and determine sentiment, intent, escalation needs
   */
  private async analyzeResponse(
    incomingMessage: string,
    aiResponse: string,
    settings: any
  ): Promise<Omit<AIResponse, 'response'>> {
    // Call AI for analysis
    const analysisPrompt = `Analyze this customer message and AI response:

Customer Message: "${incomingMessage}"
AI Response: "${aiResponse}"

Provide analysis in the following JSON format:
{
  "confidence": 0.85,
  "sentiment": "positive",
  "intent": "question",
  "needsHumanReview": false,
  "escalationReason": "",
  "detectedLanguage": "en",
  "keyTopics": ["product_inquiry", "pricing"],
  "suggestedActions": ["send_catalog", "follow_up"]
}

Sentiment: positive, negative, neutral, angry
Intent: question, complaint, thank_you, booking, pricing_inquiry, support_request, general
Confidence: 0.0 to 1.0 (how confident AI is in its response)
needsHumanReview: true if confidence < ${settings.confidenceThreshold || 0.7} or if it's a complaint/complex issue
detectedLanguage: ISO language code
keyTopics: array of main topics discussed
suggestedActions: array of recommended next steps

Respond with raw JSON only.`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing customer service conversations.',
            },
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis API call failed');
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0]?.message?.content || '{}');

      // Check for escalation keywords
      const escalationKeywords = settings.escalationKeywords
        ? JSON.parse(settings.escalationKeywords)
        : [];
      const hasEscalationKeyword = escalationKeywords.some((keyword: string) =>
        incomingMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasEscalationKeyword) {
        analysis.needsHumanReview = true;
        analysis.escalationReason = 'Contains escalation keyword';
      }

      return {
        confidence: analysis.confidence || 0.5,
        sentiment: analysis.sentiment || 'neutral',
        intent: analysis.intent || 'general',
        needsHumanReview: analysis.needsHumanReview || analysis.confidence < (settings.confidenceThreshold || 0.7),
        escalationReason: analysis.escalationReason || undefined,
        detectedLanguage: analysis.detectedLanguage || 'en',
        keyTopics: analysis.keyTopics || [],
        suggestedActions: analysis.suggestedActions || [],
      };
    } catch (error) {
      console.error('Analysis failed:', error);
      // Return safe defaults
      return {
        confidence: 0.5,
        sentiment: 'neutral',
        intent: 'general',
        needsHumanReview: true,
        escalationReason: 'Analysis failed',
        detectedLanguage: 'en',
        keyTopics: [],
        suggestedActions: [],
      };
    }
  }

  /**
   * Check if current time is within business hours
   */
  private isWithinBusinessHours(settings: any): boolean {
    if (!settings.businessHoursEnabled) return true;

    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const businessDays = settings.businessDays ? JSON.parse(settings.businessDays) : [];

    // Check if today is a business day
    if (!businessDays.includes(dayOfWeek)) {
      return false;
    }

    // Check if within business hours
    if (settings.businessHoursStart && settings.businessHoursEnd) {
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      return currentTime >= settings.businessHoursStart && currentTime <= settings.businessHoursEnd;
    }

    return true;
  }

  /**
   * Create after-hours response
   */
  private createAfterHoursResponse(settings: any, incomingMessage: string): AIResponse {
    const defaultMessage = "Thank you for your message. We're currently outside of business hours. We'll respond during our next business day.";
    
    return {
      response: settings.afterHoursMessage || defaultMessage,
      confidence: 1.0,
      sentiment: 'neutral',
      intent: 'after_hours',
      needsHumanReview: false,
      detectedLanguage: settings.responseLanguage || 'en',
      keyTopics: ['after_hours'],
      suggestedActions: ['follow_up_during_business_hours'],
    };
  }

  /**
   * Generate suggested reply for human agents
   */
  async generateSuggestedReply(context: MessageContext): Promise<string> {
    this.ensureConfigured();
    const { userId, incomingMessage, contactName, conversationHistory } = context;

    const knowledgeBase = await prisma.knowledgeBase.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'desc' },
    });

    const systemPrompt = `You are helping a human customer service agent respond to a customer message.
Generate a suggested reply that the agent can use or modify.

KNOWLEDGE BASE:
${knowledgeBase.map((kb, i) => `${i + 1}. ${kb.title}\n${kb.content}`).join('\n\n')}

Make the suggestion professional, helpful, and personalized for ${contactName}.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory?.slice(-5).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })) || []),
      { role: 'user', content: incomingMessage },
    ];

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages,
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No suggestion available';
    } catch (error) {
      console.error('Failed to generate suggested reply:', error);
      return 'Error generating suggestion';
    }
  }
}

export const aiResponseService = new AIResponseService();
