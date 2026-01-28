/**
 * White-Label Voice AI Platform Service
 * 
 * Manages the master ElevenLabs API key, agency subscriptions,
 * usage tracking, and billing for the white-labeled Voice AI system.
 * 
 * Key Features:
 * - Master API key storage (encrypted)
 * - Per-agency subscription management
 * - Usage tracking and quota enforcement
 * - Billing record generation
 * - Agent prefix generation for multi-tenant isolation
 */

import { prisma } from '@/lib/db';
import { VoiceAISubscriptionTier, VoiceAICallDirection, VoiceAICallStatus, VoiceAIBillingStatus } from '@prisma/client';

// Tier configurations
const TIER_CONFIGS: Record<VoiceAISubscriptionTier, { minutes: number; pricePerMin: number }> = {
  STARTER: { minutes: 100, pricePerMin: 0.50 },
  PROFESSIONAL: { minutes: 500, pricePerMin: 0.45 },
  ENTERPRISE: { minutes: 2000, pricePerMin: 0.35 },
  CUSTOM: { minutes: 0, pricePerMin: 0 }, // Custom is set per agency
};

export class VoiceAIPlatformService {
  /**
   * Get the platform's master ElevenLabs API key
   * This is the ONLY key used for all agencies
   */
  async getMasterApiKey(): Promise<string | null> {
    try {
      const config = await prisma.platformVoiceAIConfig.findFirst({
        where: { isActive: true },
      });
      
      if (!config?.masterElevenLabsKey) {
        // Fallback to environment variable if not configured in DB
        return process.env.ELEVENLABS_API_KEY || null;
      }
      
      return config.masterElevenLabsKey;
    } catch (error) {
      console.error('[VoiceAIPlatform] Error getting master API key:', error);
      return process.env.ELEVENLABS_API_KEY || null;
    }
  }

  /**
   * Get platform configuration
   */
  async getPlatformConfig() {
    let config = await prisma.platformVoiceAIConfig.findFirst({
      where: { isActive: true },
    });
    
    // Create default config if none exists
    if (!config && process.env.ELEVENLABS_API_KEY) {
      config = await prisma.platformVoiceAIConfig.create({
        data: {
          masterElevenLabsKey: process.env.ELEVENLABS_API_KEY,
          defaultPricePerMin: 0.50,
          defaultOverageRate: 0.75,
          totalMonthlyQuota: 2000,
          usedThisMonth: 0,
          isActive: true,
        },
      });
    }
    
    return config;
  }

  /**
   * Update platform configuration (Admin only)
   */
  async updatePlatformConfig(data: {
    masterElevenLabsKey?: string;
    masterTwilioSid?: string;
    masterTwilioToken?: string;
    defaultPricePerMin?: number;
    defaultOverageRate?: number;
    totalMonthlyQuota?: number;
  }) {
    const existing = await prisma.platformVoiceAIConfig.findFirst({
      where: { isActive: true },
    });

    if (existing) {
      return prisma.platformVoiceAIConfig.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.platformVoiceAIConfig.create({
      data: {
        masterElevenLabsKey: data.masterElevenLabsKey || '',
        masterTwilioSid: data.masterTwilioSid,
        masterTwilioToken: data.masterTwilioToken,
        defaultPricePerMin: data.defaultPricePerMin ?? 0.50,
        defaultOverageRate: data.defaultOverageRate ?? 0.75,
        totalMonthlyQuota: data.totalMonthlyQuota ?? 2000,
        isActive: true,
      },
    });
  }

  /**
   * Get or create an agency's Voice AI subscription
   */
  async getAgencySubscription(userId: string) {
    let subscription = await prisma.voiceAISubscription.findUnique({
      where: { userId },
    });

    // Auto-create STARTER subscription if none exists
    if (!subscription) {
      const platformConfig = await this.getPlatformConfig();
      const tierConfig = TIER_CONFIGS.STARTER;
      
      subscription = await prisma.voiceAISubscription.create({
        data: {
          userId,
          tier: 'STARTER',
          monthlyMinutesQuota: tierConfig.minutes,
          pricePerMinute: platformConfig?.defaultPricePerMin ?? tierConfig.pricePerMin,
          overageRate: platformConfig?.defaultOverageRate ?? 0.75,
          overageAllowed: false,
          isActive: true,
          agentPrefix: this.generateAgentPrefix(userId),
        },
      });
    }

    return subscription;
  }

  /**
   * Update an agency's subscription tier
   */
  async updateAgencySubscription(userId: string, data: {
    tier?: VoiceAISubscriptionTier;
    monthlyMinutesQuota?: number;
    pricePerMinute?: number;
    overageAllowed?: boolean;
    overageRate?: number;
    isActive?: boolean;
    notes?: string;
  }) {
    const subscription = await this.getAgencySubscription(userId);
    
    // If tier is changing, update quota based on tier
    let quota = data.monthlyMinutesQuota;
    if (data.tier && data.tier !== subscription.tier && !quota) {
      quota = TIER_CONFIGS[data.tier].minutes;
    }

    return prisma.voiceAISubscription.update({
      where: { id: subscription.id },
      data: {
        ...data,
        monthlyMinutesQuota: quota,
      },
    });
  }

  /**
   * Generate a unique agent prefix for an agency
   * Format: ag_{first8CharsOfUserId}
   */
  generateAgentPrefix(userId: string): string {
    return `ag_${userId.slice(0, 8)}`;
  }

  /**
   * Generate the full agent name for ElevenLabs
   * Format: {agentPrefix}_{agentType}
   */
  generateAgentName(agentPrefix: string, agentType: string): string {
    return `${agentPrefix}_${agentType.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Check if an agency has available quota for a call
   */
  async checkQuotaAvailable(userId: string, estimatedMinutes: number = 1): Promise<{
    available: boolean;
    remainingMinutes: number;
    overageAllowed: boolean;
    message?: string;
  }> {
    const subscription = await this.getAgencySubscription(userId);
    
    if (!subscription.isActive) {
      return {
        available: false,
        remainingMinutes: 0,
        overageAllowed: false,
        message: 'Voice AI subscription is inactive. Please contact support.',
      };
    }

    const remaining = subscription.monthlyMinutesQuota - subscription.minutesUsedThisMonth;
    
    if (remaining >= estimatedMinutes) {
      return {
        available: true,
        remainingMinutes: remaining,
        overageAllowed: subscription.overageAllowed,
      };
    }

    if (subscription.overageAllowed) {
      return {
        available: true,
        remainingMinutes: remaining,
        overageAllowed: true,
        message: `Quota exceeded. Overage rate of $${subscription.overageRate}/min applies.`,
      };
    }

    return {
      available: false,
      remainingMinutes: remaining,
      overageAllowed: false,
      message: `Monthly quota of ${subscription.monthlyMinutesQuota} minutes exceeded. Upgrade your plan for more minutes.`,
    };
  }

  /**
   * Log a Voice AI call and update usage
   */
  async logCall(data: {
    userId: string;
    agentId?: string;
    elevenLabsAgentId?: string;
    elevenLabsCallId?: string;
    direction: VoiceAICallDirection;
    durationSeconds: number;
    callerNumber?: string;
    recipientNumber?: string;
    status: VoiceAICallStatus;
    recordingUrl?: string;
    transcriptUrl?: string;
    metadata?: Record<string, unknown>;
    errorMessage?: string;
  }) {
    const subscription = await this.getAgencySubscription(data.userId);
    
    // Calculate minutes (rounded up to nearest 0.1)
    const durationMinutes = Math.ceil(data.durationSeconds / 6) / 10;
    
    // Calculate cost
    const isOverage = subscription.minutesUsedThisMonth >= subscription.monthlyMinutesQuota;
    const rate = isOverage ? Number(subscription.overageRate) : Number(subscription.pricePerMinute);
    const cost = durationMinutes * rate;

    // Create usage log
    const usageLog = await prisma.voiceAIUsageLog.create({
      data: {
        userId: data.userId,
        subscriptionId: subscription.id,
        agentId: data.agentId,
        elevenLabsAgentId: data.elevenLabsAgentId,
        elevenLabsCallId: data.elevenLabsCallId,
        direction: data.direction,
        durationSeconds: data.durationSeconds,
        durationMinutes: durationMinutes,
        cost: cost,
        callerNumber: data.callerNumber,
        recipientNumber: data.recipientNumber,
        status: data.status,
        recordingUrl: data.recordingUrl,
        transcriptUrl: data.transcriptUrl,
        metadata: data.metadata as object,
        errorMessage: data.errorMessage,
      },
    });

    // Update subscription usage
    if (data.status === 'COMPLETED' || data.status === 'IN_PROGRESS') {
      await prisma.voiceAISubscription.update({
        where: { id: subscription.id },
        data: {
          minutesUsedThisMonth: {
            increment: Math.ceil(durationMinutes),
          },
        },
      });

      // Update platform total usage
      const platformConfig = await this.getPlatformConfig();
      if (platformConfig) {
        await prisma.platformVoiceAIConfig.update({
          where: { id: platformConfig.id },
          data: {
            usedThisMonth: {
              increment: Math.ceil(durationMinutes),
            },
          },
        });
      }
    }

    return usageLog;
  }

  /**
   * Get usage logs for an agency
   */
  async getAgencyUsageLogs(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = { userId };
    
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) (where.createdAt as Record<string, Date>).gte = options.startDate;
      if (options.endDate) (where.createdAt as Record<string, Date>).lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.voiceAIUsageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.voiceAIUsageLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get usage summary for an agency
   */
  async getAgencyUsageSummary(userId: string) {
    const subscription = await this.getAgencySubscription(userId);
    
    const [totalCalls, totalMinutes, totalCost] = await Promise.all([
      prisma.voiceAIUsageLog.count({
        where: { userId, subscriptionId: subscription.id },
      }),
      prisma.voiceAIUsageLog.aggregate({
        where: { userId, subscriptionId: subscription.id },
        _sum: { durationMinutes: true },
      }),
      prisma.voiceAIUsageLog.aggregate({
        where: { userId, subscriptionId: subscription.id },
        _sum: { cost: true },
      }),
    ]);

    return {
      subscription,
      usage: {
        totalCalls,
        totalMinutes: Number(totalMinutes._sum.durationMinutes ?? 0),
        totalCost: Number(totalCost._sum.cost ?? 0),
        remainingMinutes: Math.max(0, subscription.monthlyMinutesQuota - subscription.minutesUsedThisMonth),
        percentUsed: Math.round((subscription.minutesUsedThisMonth / subscription.monthlyMinutesQuota) * 100),
      },
    };
  }

  /**
   * Generate a monthly billing record for an agency
   */
  async generateBillingRecord(userId: string, periodStart: Date, periodEnd: Date) {
    const subscription = await this.getAgencySubscription(userId);
    
    // Get usage for the period
    const usage = await prisma.voiceAIUsageLog.aggregate({
      where: {
        userId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: {
        durationMinutes: true,
        cost: true,
      },
    });

    const totalMinutes = Math.ceil(Number(usage._sum.durationMinutes ?? 0));
    const quotaMinutes = subscription.monthlyMinutesQuota;
    const overageMinutes = Math.max(0, totalMinutes - quotaMinutes);
    const baseCost = Math.min(totalMinutes, quotaMinutes) * Number(subscription.pricePerMinute);
    const overageCost = overageMinutes * Number(subscription.overageRate);
    const totalCost = baseCost + overageCost;

    // Generate invoice number
    const invoiceNumber = `VAI-${userId.slice(0, 6).toUpperCase()}-${Date.now()}`;

    return prisma.voiceAIBillingRecord.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        totalMinutesUsed: totalMinutes,
        quotaMinutes,
        overageMinutes,
        baseCost,
        overageCost,
        totalCost,
        status: 'PENDING',
        invoiceNumber,
      },
    });
  }

  /**
   * Get billing records for an agency
   */
  async getAgencyBillingRecords(userId: string) {
    return prisma.voiceAIBillingRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Reset monthly usage for all agencies (run at billing cycle start)
   */
  async resetMonthlyUsage() {
    const now = new Date();
    
    // Reset all subscriptions
    await prisma.voiceAISubscription.updateMany({
      where: { isActive: true },
      data: {
        minutesUsedThisMonth: 0,
        billingCycleStart: now,
      },
    });

    // Reset platform usage
    await prisma.platformVoiceAIConfig.updateMany({
      where: { isActive: true },
      data: {
        usedThisMonth: 0,
        billingCycleStart: now,
      },
    });

    return { reset: true, timestamp: now };
  }

  /**
   * Get all agency subscriptions (Admin only)
   */
  async getAllAgencySubscriptions(options?: {
    tier?: VoiceAISubscriptionTier;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (options?.tier) where.tier = options.tier;
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    const [subscriptions, total] = await Promise.all([
      prisma.voiceAISubscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              industry: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.voiceAISubscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  /**
   * Get platform-wide usage statistics (Admin only)
   */
  async getPlatformStats() {
    const [config, totalAgencies, activeAgencies, totalMinutes, totalCost] = await Promise.all([
      this.getPlatformConfig(),
      prisma.voiceAISubscription.count(),
      prisma.voiceAISubscription.count({ where: { isActive: true } }),
      prisma.voiceAIUsageLog.aggregate({ _sum: { durationMinutes: true } }),
      prisma.voiceAIUsageLog.aggregate({ _sum: { cost: true } }),
    ]);

    return {
      config,
      stats: {
        totalAgencies,
        activeAgencies,
        totalMinutesUsed: Number(totalMinutes._sum.durationMinutes ?? 0),
        totalRevenue: Number(totalCost._sum.cost ?? 0),
        platformQuotaUsed: config?.usedThisMonth ?? 0,
        platformQuotaLimit: config?.totalMonthlyQuota ?? 2000,
      },
    };
  }
}

// Singleton instance
export const voiceAIPlatform = new VoiceAIPlatformService();
