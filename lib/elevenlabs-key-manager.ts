
/**
 * ElevenLabs API Key Manager
 * 
 * Handles automatic failover between multiple ElevenLabs API keys:
 * - Monitors character usage on primary account
 * - Automatically switches to backup when primary hits 95% capacity
 * - Switches back to primary when it has available credits
 */

import { prisma } from './db';

const USAGE_THRESHOLD = 0.95; // Switch to backup at 95% usage
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

interface ElevenLabsKeyInfo {
  apiKey: string;
  label: string;
  priority: number;
  characterLimit: number;
  characterUsed: number;
  usagePercent: number;
}

class ElevenLabsKeyManager {
  private cachedKey: string | null = null;
  private lastCheckTime: number = 0;
  private userId: string | null = null;

  /**
   * Get the active ElevenLabs API key for a user
   * Automatically handles failover if primary account is at capacity
   */
  async getActiveApiKey(userId: string): Promise<string> {
    this.userId = userId;

    // Return cached key if still valid (checked within last 5 minutes)
    if (this.cachedKey && (Date.now() - this.lastCheckTime) < CHECK_INTERVAL) {
      console.log('🔑 [ElevenLabs] Using cached API key');
      return this.cachedKey;
    }

    console.log('🔍 [ElevenLabs] Checking API key status...');

    // Get all active API keys for this user, ordered by priority
    const apiKeys = await prisma.elevenLabsApiKey.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        priority: 'asc', // Lower priority number = higher priority
      },
    });

    if (apiKeys.length === 0) {
      console.warn('⚠️  [ElevenLabs] No API keys configured, falling back to environment variable');
      return process.env.ELEVENLABS_API_KEY || '';
    }

    // Try each key in priority order until we find one with available capacity
    for (const keyRecord of apiKeys) {
      const subscription = await this.checkSubscription(keyRecord.apiKey);
      
      if (!subscription) {
        console.warn(`⚠️  [ElevenLabs] Failed to check subscription for ${keyRecord.label}`);
        continue;
      }

      const usagePercent = subscription.character_limit > 0 
        ? subscription.character_count / subscription.character_limit 
        : 0;

      console.log(`📊 [ElevenLabs] ${keyRecord.label}: ${(usagePercent * 100).toFixed(1)}% used`);

      // Update database with latest usage
      await prisma.elevenLabsApiKey.update({
        where: { id: keyRecord.id },
        data: {
          characterLimit: subscription.character_limit,
          characterUsed: subscription.character_count,
          lastCheckedAt: new Date(),
        },
      });

      // If this key has available capacity, use it
      if (usagePercent < USAGE_THRESHOLD) {
        console.log(`✅ [ElevenLabs] Using ${keyRecord.label} (${(usagePercent * 100).toFixed(1)}% used)`);
        this.cachedKey = keyRecord.apiKey;
        this.lastCheckTime = Date.now();
        return keyRecord.apiKey;
      }

      console.log(`⚠️  [ElevenLabs] ${keyRecord.label} is at capacity (${(usagePercent * 100).toFixed(1)}% used)`);
    }

    // All keys are at capacity - use primary anyway and log warning
    console.error('❌ [ElevenLabs] All API keys are at or near capacity!');
    const primaryKey = apiKeys[0]?.apiKey || process.env.ELEVENLABS_API_KEY || '';
    this.cachedKey = primaryKey;
    this.lastCheckTime = Date.now();
    return primaryKey;
  }

  /**
   * Check subscription status for a given API key
   */
  private async checkSubscription(apiKey: string): Promise<any | null> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking ElevenLabs subscription:', error);
      return null;
    }
  }

  /**
   * Get all API keys for a user with their status
   */
  async getAllKeys(userId: string): Promise<ElevenLabsKeyInfo[]> {
    const apiKeys = await prisma.elevenLabsApiKey.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    });

    return apiKeys.map(key => ({
      apiKey: key.apiKey,
      label: key.label,
      priority: key.priority,
      characterLimit: key.characterLimit,
      characterUsed: key.characterUsed,
      usagePercent: key.characterLimit > 0 
        ? key.characterUsed / key.characterLimit 
        : 0,
    }));
  }

  /**
   * Add a new API key
   */
  async addApiKey(params: {
    userId: string;
    apiKey: string;
    label: string;
    priority: number;
  }): Promise<void> {
    const { userId, apiKey, label, priority } = params;

    // Verify the API key works by checking subscription
    const subscription = await this.checkSubscription(apiKey);
    if (!subscription) {
      throw new Error('Invalid ElevenLabs API key or unable to verify subscription');
    }

    await prisma.elevenLabsApiKey.create({
      data: {
        userId,
        apiKey,
        label,
        priority,
        characterLimit: subscription.character_limit,
        characterUsed: subscription.character_count,
      },
    });

    // Clear cache to force recheck
    this.cachedKey = null;
    console.log(`✅ [ElevenLabs] Added new API key: ${label}`);
  }

  /**
   * Remove an API key
   */
  async removeApiKey(userId: string, keyId: string): Promise<void> {
    await prisma.elevenLabsApiKey.delete({
      where: {
        id: keyId,
        userId, // Ensure ownership
      },
    });

    // Clear cache to force recheck
    this.cachedKey = null;
    console.log(`✅ [ElevenLabs] Removed API key: ${keyId}`);
  }

  /**
   * Update API key priority
   */
  async updatePriority(userId: string, keyId: string, newPriority: number): Promise<void> {
    await prisma.elevenLabsApiKey.update({
      where: {
        id: keyId,
        userId, // Ensure ownership
      },
      data: { priority: newPriority },
    });

    // Clear cache to force recheck
    this.cachedKey = null;
    console.log(`✅ [ElevenLabs] Updated API key priority`);
  }

  /**
   * Toggle API key active status
   */
  async toggleActive(userId: string, keyId: string, isActive: boolean): Promise<void> {
    await prisma.elevenLabsApiKey.update({
      where: {
        id: keyId,
        userId, // Ensure ownership
      },
      data: { isActive },
    });

    // Clear cache to force recheck
    this.cachedKey = null;
    console.log(`✅ [ElevenLabs] API key ${isActive ? 'activated' : 'deactivated'}`);
  }

  /**
   * Force refresh of all API key statuses
   */
  async refreshAllKeys(userId: string): Promise<void> {
    const apiKeys = await prisma.elevenLabsApiKey.findMany({
      where: { userId, isActive: true },
    });

    for (const keyRecord of apiKeys) {
      const subscription = await this.checkSubscription(keyRecord.apiKey);
      
      if (subscription) {
        await prisma.elevenLabsApiKey.update({
          where: { id: keyRecord.id },
          data: {
            characterLimit: subscription.character_limit,
            characterUsed: subscription.character_count,
            lastCheckedAt: new Date(),
          },
        });
      }
    }

    // Clear cache to force recheck
    this.cachedKey = null;
    console.log(`✅ [ElevenLabs] Refreshed all API keys`);
  }
}

export const elevenLabsKeyManager = new ElevenLabsKeyManager();
