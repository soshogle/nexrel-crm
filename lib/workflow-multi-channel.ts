
/**
 * Multi-Channel Orchestration Service
 * 
 * Intelligently selects the best communication channel based on:
 * - Lead engagement history
 * - Time of day
 * - Channel availability
 * - Past response rates
 */

import { prisma } from './db';

export interface ChannelPreference {
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'FACEBOOK_MESSENGER' | 'INSTAGRAM';
  priority: number;
  responseRate?: number;
  lastUsed?: Date;
}

export class MultiChannelOrchestrator {
  /**
   * Select the best channel for reaching a lead
   */
  async selectChannel(leadId: string, userId: string): Promise<ChannelPreference> {
    // Get lead's contact information
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get user's active channels
    const connections = await prisma.channelConnection.findMany({
      where: {
        userId,
        status: 'CONNECTED',
      },
    });

    // Get lead's message history to determine preferences
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        leadId,
      },
      include: {
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 20,
        },
        channelConnection: true,
      },
    });

    // Calculate response rates per channel
    const channelStats = this.calculateChannelStats(conversations);

    // Build preference list
    const preferences: ChannelPreference[] = [];

    // SMS priority (high response rate, direct)
    if (lead.phone && connections.some(c => c.channelType === 'SMS')) {
      preferences.push({
        channel: 'SMS',
        priority: this.calculatePriority('SMS', channelStats),
        responseRate: channelStats.get('SMS')?.responseRate,
        lastUsed: channelStats.get('SMS')?.lastUsed,
      });
    }

    // WhatsApp (very high engagement)
    if (lead.phone && connections.some(c => c.channelType === 'WHATSAPP')) {
      preferences.push({
        channel: 'WHATSAPP',
        priority: this.calculatePriority('WHATSAPP', channelStats),
        responseRate: channelStats.get('WHATSAPP')?.responseRate,
        lastUsed: channelStats.get('WHATSAPP')?.lastUsed,
      });
    }

    // Email (good for detailed info)
    if (lead.email && connections.some(c => c.channelType === 'EMAIL')) {
      preferences.push({
        channel: 'EMAIL',
        priority: this.calculatePriority('EMAIL', channelStats),
        responseRate: channelStats.get('EMAIL')?.responseRate,
        lastUsed: channelStats.get('EMAIL')?.lastUsed,
      });
    }

    // Sort by priority
    preferences.sort((a, b) => b.priority - a.priority);

    // Return best channel or default to SMS
    return preferences[0] || {
      channel: 'SMS',
      priority: 50,
    };
  }

  /**
   * Execute multi-channel sequence (try SMS → Email → WhatsApp)
   */
  async executeSequence(
    leadId: string,
    userId: string,
    message: string,
    sequence: ChannelPreference['channel'][] = ['SMS', 'EMAIL', 'WHATSAPP']
  ): Promise<{ channel: string; success: boolean }[]> {
    const results: { channel: string; success: boolean }[] = [];

    for (const channel of sequence) {
      try {
        // Try sending via this channel
        const success = await this.sendViaChannel(leadId, userId, message, channel);
        results.push({ channel, success });

        if (success) {
          // If successful, stop the sequence
          break;
        }

        // Wait before trying next channel
        await this.delay(240); // 4 hours
      } catch (error) {
        console.error(`Failed to send via ${channel}:`, error);
        results.push({ channel, success: false });
      }
    }

    return results;
  }

  /**
   * Calculate priority score for a channel
   */
  private calculatePriority(
    channel: string,
    stats: Map<string, { responseRate: number; lastUsed: Date }>
  ): number {
    const channelStat = stats.get(channel);
    
    if (!channelStat) {
      // Default priorities for channels with no history
      const defaults: Record<string, number> = {
        WHATSAPP: 90,
        SMS: 85,
        FACEBOOK_MESSENGER: 70,
        EMAIL: 60,
        INSTAGRAM: 55,
      };
      return defaults[channel] || 50;
    }

    let priority = 50;

    // Response rate factor (0-100)
    priority += channelStat.responseRate * 0.5;

    // Recency bonus (recently used channels might be monitored)
    const daysSinceUsed = (Date.now() - channelStat.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUsed < 7) {
      priority += 10;
    }

    return Math.min(100, priority);
  }

  /**
   * Calculate channel statistics from conversation history
   */
  private calculateChannelStats(conversations: any[]): Map<string, { responseRate: number; lastUsed: Date }> {
    const stats = new Map<string, { responseRate: number; lastUsed: Date }>();

    for (const conversation of conversations) {
      const channelType = conversation.channelConnection.channelType;
      const messages = conversation.messages;

      if (!messages.length) continue;

      // Calculate response rate
      const outbound = messages.filter((m: any) => m.direction === 'OUTBOUND').length;
      const inbound = messages.filter((m: any) => m.direction === 'INBOUND').length;
      const responseRate = outbound > 0 ? (inbound / outbound) * 100 : 0;

      // Get last used date
      const lastUsed = messages[0]?.sentAt || new Date();

      if (!stats.has(channelType) || stats.get(channelType)!.lastUsed < lastUsed) {
        stats.set(channelType, { responseRate, lastUsed });
      }
    }

    return stats;
  }

  /**
   * Send message via specific channel
   */
  private async sendViaChannel(
    leadId: string,
    userId: string,
    message: string,
    channel: ChannelPreference['channel']
  ): Promise<boolean> {
    // This would integrate with actual messaging services
    // For now, just log the action
    console.log(`📤 Sending via ${channel} to lead ${leadId}: ${message}`);
    
    // TODO: Integrate with actual messaging APIs
    // - Twilio for SMS
    // - SendGrid for Email
    // - WhatsApp Business API
    // - ElevenLabs for Voice
    
    return true;
  }

  /**
   * Delay helper
   */
  private delay(minutes: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, minutes * 60000));
  }
}

export const multiChannelOrchestrator = new MultiChannelOrchestrator();

