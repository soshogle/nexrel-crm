/**
 * Billing Service
 * Fetches actual billing data from Twilio and ElevenLabs APIs
 */

import { prisma } from '@/lib/db';

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';

// ElevenLabs API key
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

interface BillingData {
  calls: {
    count: number;
    minutes: number;
    cost: number;
    rate: number; // cost per minute
  };
  sms: {
    count: number;
    cost: number;
    rate: number; // cost per message
  };
  ai: {
    minutes: number;
    cost: number;
    rate: number; // cost per minute
  };
  llm: {
    tokens: number;
    cost: number;
    rate: number; // cost per 1K tokens
    breakdown: {
      chatMessages: number;
      transcriptions: number;
      aiSuggestions: number;
    };
  };
  storage: {
    gb: number;
    cost: number;
    rate: number; // cost per GB
  };
  total: number;
}

export class BillingService {
  /**
   * Get actual billing data for a user
   */
  async getUserBillingData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BillingData> {
    try {
      // Fetch Twilio billing data (calls + SMS)
      const twilioData = await this.getTwilioBillingData(userId, startDate, endDate);

      // Fetch ElevenLabs usage data
      const elevenLabsData = await this.getElevenLabsBillingData(userId, startDate, endDate);

      // Calculate LLM token usage and costs
      const llmData = await this.getLLMBillingData(userId, startDate, endDate);

      // Calculate storage costs
      const storageData = await this.getStorageCosts(userId, startDate, endDate);

      // Calculate total
      const total =
        twilioData.calls.cost +
        twilioData.sms.cost +
        elevenLabsData.cost +
        llmData.cost +
        storageData.cost;

      return {
        calls: twilioData.calls,
        sms: twilioData.sms,
        ai: {
          minutes: elevenLabsData.minutes,
          cost: elevenLabsData.cost,
          rate: elevenLabsData.rate,
        },
        llm: llmData,
        storage: storageData,
        total,
      };
    } catch (error) {
      console.error('Error fetching billing data:', error);
      // Return estimates as fallback
      return await this.getEstimatedBillingData(userId, startDate, endDate);
    }
  }

  /**
   * Fetch actual Twilio billing data
   */
  private async getTwilioBillingData(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      // Format dates for Twilio API (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch call records from Twilio
      const callsUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json?StartTime>=${startDateStr}&StartTime<=${endDateStr}&PageSize=1000`;
      const callsResponse = await fetch(callsUrl, {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        },
      });

      if (!callsResponse.ok) {
        throw new Error('Failed to fetch Twilio call data');
      }

      const callsData = await callsResponse.json();
      const calls = callsData.calls || [];

      // Calculate call metrics
      let totalCallMinutes = 0;
      let totalCallCost = 0;

      for (const call of calls) {
        const duration = parseInt(call.duration || '0');
        const price = Math.abs(parseFloat(call.price || '0'));
        totalCallMinutes += duration / 60;
        totalCallCost += price;
      }

      const callRate = totalCallMinutes > 0 ? totalCallCost / totalCallMinutes : 0;

      // Fetch SMS records from Twilio
      const smsUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json?DateSent>=${startDateStr}&DateSent<=${endDateStr}&PageSize=1000`;
      const smsResponse = await fetch(smsUrl, {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        },
      });

      if (!smsResponse.ok) {
        throw new Error('Failed to fetch Twilio SMS data');
      }

      const smsData = await smsResponse.json();
      const messages = smsData.messages || [];

      // Calculate SMS metrics
      let totalSmsCount = 0;
      let totalSmsCost = 0;

      for (const message of messages) {
        const price = Math.abs(parseFloat(message.price || '0'));
        totalSmsCount += 1;
        totalSmsCost += price;
      }

      const smsRate = totalSmsCount > 0 ? totalSmsCost / totalSmsCount : 0;

      return {
        calls: {
          count: calls.length,
          minutes: totalCallMinutes,
          cost: totalCallCost,
          rate: callRate,
        },
        sms: {
          count: totalSmsCount,
          cost: totalSmsCost,
          rate: smsRate,
        },
      };
    } catch (error) {
      console.error('Error fetching Twilio billing data:', error);
      // Return database-based estimates as fallback
      return await this.getTwilioEstimates(userId, startDate, endDate);
    }
  }

  /**
   * Fetch actual ElevenLabs billing data
   */
  private async getElevenLabsBillingData(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      // Fetch subscription info from ElevenLabs
      const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ElevenLabs subscription data');
      }

      const subscription = await response.json();

      // Get character usage (ElevenLabs charges per character, not minute)
      const characterCount = subscription.character_count || 0;
      const characterLimit = subscription.character_limit || 0;

      // Estimate minutes (average speaking rate: ~150 words/minute, ~5 chars/word)
      const estimatedMinutes = characterCount / (150 * 5);

      // Get pricing tier
      const tier = subscription.tier || 'free';

      // Calculate cost per minute based on tier
      let costPerMinute = 0;
      let totalCost = 0;

      // ElevenLabs pricing (as of 2024)
      const pricing: Record<string, { monthly: number; characters: number }> = {
        free: { monthly: 0, characters: 10000 },
        starter: { monthly: 5, characters: 30000 },
        creator: { monthly: 22, characters: 100000 },
        pro: { monthly: 99, characters: 500000 },
        scale: { monthly: 330, characters: 2000000 },
      };

      const tierData = pricing[tier.toLowerCase()] || pricing.free;

      // Calculate cost per character
      const costPerCharacter = tierData.monthly / tierData.characters;

      // Total cost for characters used
      totalCost = characterCount * costPerCharacter;

      // Cost per minute
      costPerMinute = estimatedMinutes > 0 ? totalCost / estimatedMinutes : 0;

      return {
        minutes: estimatedMinutes,
        cost: totalCost,
        rate: costPerMinute,
      };
    } catch (error) {
      console.error('Error fetching ElevenLabs billing data:', error);
      // Return database-based estimates as fallback
      return await this.getElevenLabsEstimates(userId, startDate, endDate);
    }
  }

  /**
   * Calculate LLM token usage and costs
   */
  private async getLLMBillingData(userId: string, startDate: Date, endDate: Date) {
    try {
      let chatMessageTokens = 0;
      let transcriptionTokens = 0;
      let aiSuggestionTokens = 0;

      // 1. Calculate tokens from chat messages (AI Chat Assistant)
      const chatMessages = await prisma.conversationMessage.findMany({
        where: {
          conversation: {
            userId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          content: true,
        },
      });

      for (const message of chatMessages) {
        // Estimate tokens: ~1.3 tokens per word, ~5 characters per word
        const words = (message.content || '').length / 5;
        chatMessageTokens += Math.ceil(words * 1.3);
      }

      // 2. Calculate tokens from call transcriptions
      const callLogs = await prisma.callLog.findMany({
        where: {
          voiceAgent: {
            userId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          transcription: {
            not: null,
          },
        },
        select: {
          transcription: true,
        },
      });

      for (const log of callLogs) {
        // Estimate tokens from transcription
        const words = (log.transcription || '').length / 5;
        transcriptionTokens += Math.ceil(words * 1.3);
      }

      // 3. Calculate tokens from AI task suggestions and categorizations
      // Check TaskActivity records where AI was involved
      const aiTaskActivities = await prisma.taskActivity.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          action: {
            in: ['AI_SUGGESTED', 'AI_CATEGORIZED', 'AI_CREATED'],
          },
        },
        select: {
          metadata: true,
        },
      });

      for (const activity of aiTaskActivities) {
        // Estimate tokens from AI task processing (typical: 100-200 tokens per task)
        aiSuggestionTokens += 150; // Average estimate
      }

      // Calculate total tokens
      const totalTokens = chatMessageTokens + transcriptionTokens + aiSuggestionTokens;

      // Pricing: Using Abacus.AI / OpenAI GPT-4o pricing as reference
      // $0.005 per 1K input tokens, $0.015 per 1K output tokens
      // Average: $0.01 per 1K tokens
      const costPer1KTokens = 0.01;
      const totalCost = (totalTokens / 1000) * costPer1KTokens;

      return {
        tokens: totalTokens,
        cost: totalCost,
        rate: costPer1KTokens, // per 1K tokens
        breakdown: {
          chatMessages: chatMessageTokens,
          transcriptions: transcriptionTokens,
          aiSuggestions: aiSuggestionTokens,
        },
      };
    } catch (error) {
      console.error('Error calculating LLM billing data:', error);
      return {
        tokens: 0,
        cost: 0,
        rate: 0.01,
        breakdown: {
          chatMessages: 0,
          transcriptions: 0,
          aiSuggestions: 0,
        },
      };
    }
  }

  /**
   * Calculate storage costs
   */
  private async getStorageCosts(userId: string, startDate: Date, endDate: Date) {
    try {
      // Get call logs with recordings
      const callLogs = await prisma.callLog.findMany({
        where: {
          voiceAgent: {
            userId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          recordingUrl: {
            not: null,
          },
        },
        select: {
          duration: true,
        },
      });

      // Estimate storage: ~1MB per minute of recording
      const totalMinutes = callLogs.reduce(
        (sum, log) => sum + (log.duration || 0) / 60,
        0
      );
      const totalGB = totalMinutes / 1000; // 1GB = 1000 minutes

      // Storage cost: $0.10/GB (AWS S3 standard pricing)
      const storageCost = totalGB * 0.1;

      return {
        gb: totalGB,
        cost: storageCost,
        rate: 0.1, // $0.10 per GB
      };
    } catch (error) {
      console.error('Error calculating storage costs:', error);
      return {
        gb: 0,
        cost: 0,
        rate: 0.1,
      };
    }
  }

  /**
   * Fallback: Get estimated billing data from database
   */
  private async getEstimatedBillingData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BillingData> {
    // Get call logs
    const callLogs = await prisma.callLog.findMany({
      where: {
        voiceAgent: {
          userId,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalMinutes = callLogs.reduce(
      (sum, log) => sum + (log.duration || 0) / 60,
      0
    );
    const callCost = totalMinutes * 0.02; // Estimated $0.02/min

    // Get SMS messages
    const smsMessages = await prisma.conversationMessage.findMany({
      where: {
        conversation: {
          userId,
          channelConnection: {
            channelType: 'SMS',
          },
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const smsCost = smsMessages.length * 0.01; // Estimated $0.01/message

    // Estimate AI costs
    const aiMinutes = totalMinutes; // Assume all call minutes use AI
    const aiCost = aiMinutes * 0.05; // Estimated $0.05/min for AI

    // Estimate LLM costs (fallback)
    const llmData = await this.getLLMBillingData(userId, startDate, endDate);

    // Storage costs
    const storageGB = totalMinutes / 1000;
    const storageCost = storageGB * 0.1;

    return {
      calls: {
        count: callLogs.length,
        minutes: totalMinutes,
        cost: callCost,
        rate: 0.02,
      },
      sms: {
        count: smsMessages.length,
        cost: smsCost,
        rate: 0.01,
      },
      ai: {
        minutes: aiMinutes,
        cost: aiCost,
        rate: 0.05,
      },
      llm: llmData,
      storage: {
        gb: storageGB,
        cost: storageCost,
        rate: 0.1,
      },
      total: callCost + smsCost + aiCost + llmData.cost + storageCost,
    };
  }

  /**
   * Fallback: Get Twilio estimates from database
   */
  private async getTwilioEstimates(userId: string, startDate: Date, endDate: Date) {
    const callLogs = await prisma.callLog.findMany({
      where: {
        voiceAgent: {
          userId,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalMinutes = callLogs.reduce(
      (sum, log) => sum + (log.duration || 0) / 60,
      0
    );
    const callCost = totalMinutes * 0.02;

    const smsMessages = await prisma.conversationMessage.findMany({
      where: {
        conversation: {
          userId,
          channelConnection: {
            channelType: 'SMS',
          },
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const smsCost = smsMessages.length * 0.01;

    return {
      calls: {
        count: callLogs.length,
        minutes: totalMinutes,
        cost: callCost,
        rate: 0.02,
      },
      sms: {
        count: smsMessages.length,
        cost: smsCost,
        rate: 0.01,
      },
    };
  }

  /**
   * Fallback: Get ElevenLabs estimates from database
   */
  private async getElevenLabsEstimates(userId: string, startDate: Date, endDate: Date) {
    const callLogs = await prisma.callLog.findMany({
      where: {
        voiceAgent: {
          userId,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalMinutes = callLogs.reduce(
      (sum, log) => sum + (log.duration || 0) / 60,
      0
    );
    const aiCost = totalMinutes * 0.05;

    return {
      minutes: totalMinutes,
      cost: aiCost,
      rate: 0.05,
    };
  }
}

export const billingService = new BillingService();
