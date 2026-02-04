/**
 * Conversation Intelligence Service
 * Provides AI-powered analysis of call transcripts including:
 * - Sentiment analysis
 * - Key phrases extraction
 * - Call outcome detection
 * - Lead scoring recommendations
 */

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ConversationAnalysis {
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number; // -1 to 1
    customer_sentiment: 'satisfied' | 'neutral' | 'frustrated' | 'angry';
    agent_sentiment: 'professional' | 'empathetic' | 'neutral';
  };
  keyPhrases: string[];
  callOutcome: {
    outcome: 'sale' | 'follow_up' | 'objection' | 'no_interest' | 'callback_scheduled' | 'information_provided';
    confidence: number;
    notes: string;
  };
  quality: {
    score: number; // 0-100
    metrics: {
      clarity: number;
      professionalism: number;
      engagement: number;
      resolution: number;
    };
  };
  leadScoringImpact: {
    scoreAdjustment: number; // -50 to +50
    reason: string;
  };
  insights: string[];
  nextActions: string[];
}

export async function analyzeConversation(
  transcript: string,
  callDuration: number,
  leadContext?: {
    status: string;
    currentScore: number;
    previousInteractions: number;
  },
  userLanguage: string = 'en'
): Promise<ConversationAnalysis> {
  // Language instructions for AI responses
  const languageInstructions: Record<string, string> = {
    'en': 'CRITICAL: You MUST generate analysis ONLY in English. Every single word must be in English.',
    'fr': 'CRITIQUE : Vous DEVEZ générer l\'analyse UNIQUEMENT en français. Chaque mot doit être en français.',
    'es': 'CRÍTICO: DEBES generar el análisis SOLO en español. Cada palabra debe estar en español.',
    'zh': '关键：您必须仅用中文生成分析。每个词都必须是中文。',
  };
  const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];
  
  const prompt = `${languageInstruction}

You are an expert conversation analyst for a sales CRM system. Analyze the following call transcript and provide detailed insights.

Call Duration: ${Math.floor(callDuration / 1000)} seconds
${leadContext ? `\nLead Context:\n- Current Status: ${leadContext.status}\n- Current Score: ${leadContext.currentScore}\n- Previous Interactions: ${leadContext.previousInteractions}` : ''}

Transcript:
${transcript}

Provide a comprehensive analysis in the following JSON format:
{
  "sentiment": {
    "overall": "positive" | "neutral" | "negative",
    "score": <number between -1 and 1>,
    "customer_sentiment": "satisfied" | "neutral" | "frustrated" | "angry",
    "agent_sentiment": "professional" | "empathetic" | "neutral"
  },
  "keyPhrases": ["important phrase 1", "important phrase 2"],
  "callOutcome": {
    "outcome": "sale" | "follow_up" | "objection" | "no_interest" | "callback_scheduled" | "information_provided",
    "confidence": <number between 0 and 1>,
    "notes": "brief explanation"
  },
  "quality": {
    "score": <number 0-100>,
    "metrics": {
      "clarity": <number 0-100>,
      "professionalism": <number 0-100>,
      "engagement": <number 0-100>,
      "resolution": <number 0-100>
    }
  },
  "leadScoringImpact": {
    "scoreAdjustment": <number -50 to +50>,
    "reason": "explanation for score adjustment"
  },
  "insights": ["insight 1", "insight 2"],
  "nextActions": ["action 1", "action 2"]
}

Provide ONLY the JSON response, no additional text.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const analysis = JSON.parse(content) as ConversationAnalysis;
    return analysis;
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    
    // Return a fallback analysis
    return {
      sentiment: {
        overall: 'neutral',
        score: 0,
        customer_sentiment: 'neutral',
        agent_sentiment: 'neutral',
      },
      keyPhrases: [],
      callOutcome: {
        outcome: 'information_provided',
        confidence: 0.5,
        notes: 'Analysis unavailable',
      },
      quality: {
        score: 50,
        metrics: {
          clarity: 50,
          professionalism: 50,
          engagement: 50,
          resolution: 50,
        },
      },
      leadScoringImpact: {
        scoreAdjustment: 0,
        reason: 'Unable to analyze conversation',
      },
      insights: ['Analysis unavailable due to processing error'],
      nextActions: ['Manual review recommended'],
    };
  }
}

export interface RealTimeCallMetrics {
  callId: string;
  duration: number;
  participantCount: number;
  status: 'active' | 'on-hold' | 'completed';
  currentSpeaker: 'agent' | 'customer' | 'unknown';
  sentimentTrend: Array<{
    timestamp: number;
    sentiment: number;
  }>;
  liveTranscript: Array<{
    timestamp: number;
    speaker: string;
    text: string;
  }>;
}

export function calculateLeadScoreAdjustment(
  analysis: ConversationAnalysis,
  callDuration: number
): number {
  let adjustment = analysis.leadScoringImpact.scoreAdjustment;

  // Additional adjustments based on call quality
  if (analysis.quality.score > 80) {
    adjustment += 5;
  } else if (analysis.quality.score < 40) {
    adjustment -= 5;
  }

  // Adjust based on call duration (very short calls might indicate issues)
  if (callDuration < 30000 && analysis.callOutcome.outcome !== 'no_interest') {
    adjustment -= 5; // Very short call, might be incomplete
  }

  // Cap the adjustment
  return Math.max(-50, Math.min(50, adjustment));
}

export function determineNextLeadStatus(
  currentStatus: string,
  outcome: string
): 'NEW' | 'CONTACTED' | 'RESPONDED' | 'QUALIFIED' | 'CONVERTED' | 'LOST' {
  // Map outcomes to valid LeadStatus enum values
  const statusMap: Record<string, 'NEW' | 'CONTACTED' | 'RESPONDED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'> = {
    sale: 'CONVERTED',
    follow_up: 'RESPONDED',
    callback_scheduled: 'RESPONDED',
    information_provided: 'CONTACTED',
    objection: 'CONTACTED',
    no_interest: 'LOST',
  };

  // Validate current status is a valid enum value, fallback to CONTACTED
  const validStatuses = ['NEW', 'CONTACTED', 'RESPONDED', 'QUALIFIED', 'CONVERTED', 'LOST'];
  const fallback = validStatuses.includes(currentStatus) ? currentStatus as 'NEW' | 'CONTACTED' | 'RESPONDED' | 'QUALIFIED' | 'CONVERTED' | 'LOST' : 'CONTACTED';

  return statusMap[outcome] || fallback;
}
