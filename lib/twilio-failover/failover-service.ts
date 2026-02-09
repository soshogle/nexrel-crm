/**
 * Twilio Failover Service
 * Handles failover detection, approval window, and execution
 */

import { prisma } from '@/lib/db';
import { twilioHealthMonitor } from './health-monitor';
import { elevenLabsService } from '@/lib/elevenlabs';
import twilio from 'twilio';

const APPROVAL_WINDOW_MINUTES = 10;
const TEST_INTERVAL_SECONDS = 30; // Test every 30 seconds during approval window

export class TwilioFailoverService {
  /**
   * Start failover process with approval window
   */
  async startFailoverProcess(
    fromAccountId: string,
    triggerType: 'CRITICAL' | 'DEGRADED' | 'MANUAL',
    adminUserId?: string
  ) {
    // Get accounts
    const fromAccount = await prisma.twilioAccount.findUnique({
      where: { id: fromAccountId },
    });

    if (!fromAccount) {
      throw new Error('Source Twilio account not found');
    }

    // Find backup account
    const backupAccount = await prisma.twilioAccount.findFirst({
      where: {
        isActive: true,
        id: { not: fromAccountId },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!backupAccount) {
      throw new Error('No backup Twilio account available');
    }

    // Get active agents
    const eligibleAgents = await twilioHealthMonitor.getActiveEligibleAgents();
    const affectedAgents = eligibleAgents.filter(
      (agent) => agent.twilioAccountId === fromAccountId
    );

    // Create failover event
    const failoverEvent = await prisma.twilioFailoverEvent.create({
      data: {
        triggerType,
        status: triggerType === 'CRITICAL' ? 'APPROVED' : 'PENDING_APPROVAL',
        affectedAgentsCount: affectedAgents.length,
        totalActiveAgentsCount: eligibleAgents.length,
        fromAccountId,
        toAccountId: backupAccount.id,
        approvedBy: triggerType === 'CRITICAL' ? 'AUTO' : adminUserId || null,
        approvalWindowStarted: triggerType === 'DEGRADED' ? new Date() : null,
        approvedAt: triggerType === 'CRITICAL' ? new Date() : null,
        testResultsDuringWindow: triggerType === 'DEGRADED' ? [] : null,
      },
    });

    // If critical, execute immediately
    if (triggerType === 'CRITICAL') {
      await this.executeFailover(failoverEvent.id);
      return failoverEvent;
    }

    // If degraded, start approval window with continuous testing
    if (triggerType === 'DEGRADED') {
      this.startApprovalWindow(failoverEvent.id);
    }

    return failoverEvent;
  }

  /**
   * Start approval window with continuous testing
   */
  private async startApprovalWindow(failoverEventId: string) {
    const startTime = Date.now();
    const endTime = startTime + APPROVAL_WINDOW_MINUTES * 60 * 1000;
    const testResults: any[] = [];

    // Test loop during approval window
    const testInterval = setInterval(async () => {
      try {
        const event = await prisma.twilioFailoverEvent.findUnique({
          where: { id: failoverEventId },
        });

        if (!event || event.status !== 'PENDING_APPROVAL') {
          clearInterval(testInterval);
          return;
        }

        // Run health check
        const healthCheck = await twilioHealthMonitor.runHealthCheck(event.fromAccountId!);
        const testResult = {
          timestamp: new Date(),
          accountHealth: healthCheck.accountHealth.status,
          failureRate: healthCheck.summary.failureRate,
          failedAgents: healthCheck.summary.failedAgents,
          degradedAgents: healthCheck.summary.degradedAgents,
        };

        testResults.push(testResult);

        // Update event with test results
        await prisma.twilioFailoverEvent.update({
          where: { id: failoverEventId },
          data: {
            testResultsDuringWindow: testResults,
          },
        });

        // If tests pass (recovered), cancel failover
        if (
          healthCheck.accountHealth.status === 'PASS' &&
          healthCheck.summary.failureRate < 0.3
        ) {
          clearInterval(testInterval);
          await this.cancelFailover(failoverEventId, 'Issue resolved during approval window');
          return;
        }

        // Check if approval window expired
        if (Date.now() >= endTime) {
          clearInterval(testInterval);
          // Auto-approve after 10 minutes
          await this.approveFailover(failoverEventId, 'AUTO');
        }
      } catch (error) {
        console.error('Error during approval window testing:', error);
      }
    }, TEST_INTERVAL_SECONDS * 1000);
  }

  /**
   * Approve failover (manual or auto after timeout)
   */
  async approveFailover(failoverEventId: string, approvedBy: string) {
    const event = await prisma.twilioFailoverEvent.findUnique({
      where: { id: failoverEventId },
    });

    if (!event || event.status !== 'PENDING_APPROVAL') {
      throw new Error('Failover event not found or not pending approval');
    }

    // Verify still failing before executing
    const detection = await twilioHealthMonitor.detectFailoverNeeded(event.fromAccountId!);
    
    if (!detection.shouldFailover) {
      await this.cancelFailover(failoverEventId, 'Issue resolved - no longer needs failover');
      return;
    }

    // Update event
    await prisma.twilioFailoverEvent.update({
      where: { id: failoverEventId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
    });

    // Execute failover
    await this.executeFailover(failoverEventId);
  }

  /**
   * Cancel failover
   */
  async cancelFailover(failoverEventId: string, reason: string) {
    await prisma.twilioFailoverEvent.update({
      where: { id: failoverEventId },
      data: {
        status: 'CANCELLED',
        notes: reason,
      },
    });
  }

  /**
   * Execute failover
   */
  async executeFailover(failoverEventId: string) {
    const event = await prisma.twilioFailoverEvent.findUnique({
      where: { id: failoverEventId },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });

    if (!event || !event.fromAccount || !event.toAccount) {
      throw new Error('Failover event or accounts not found');
    }

    // Update status to executing
    await prisma.twilioFailoverEvent.update({
      where: { id: failoverEventId },
      data: {
        status: 'EXECUTING',
      },
    });

    try {
      // Get affected agents
      const agents = await prisma.voiceAgent.findMany({
        where: {
          twilioAccountId: event.fromAccountId,
          status: 'ACTIVE',
          elevenLabsAgentId: { not: null },
          twilioPhoneNumber: { not: null },
        },
      });

      // Get backup phone numbers
      const backupNumbers = await prisma.twilioBackupPhoneNumber.findMany({
        where: {
          twilioAccountId: event.toAccountId,
          isAssigned: false,
        },
        take: agents.length,
      });

      if (backupNumbers.length < agents.length) {
        throw new Error(`Not enough backup phone numbers. Need ${agents.length}, have ${backupNumbers.length}`);
      }

      // Switch each agent to backup account
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const backupNumber = backupNumbers[i];

        // Update agent with backup number
        await prisma.voiceAgent.update({
          where: { id: agent.id },
          data: {
            twilioAccountId: event.toAccountId,
            backupPhoneNumber: agent.twilioPhoneNumber, // Store original
            twilioPhoneNumber: backupNumber.phoneNumber,
          },
        });

        // Mark backup number as assigned
        await prisma.twilioBackupPhoneNumber.update({
          where: { id: backupNumber.id },
          data: {
            isAssigned: true,
            assignedToAgentId: agent.id,
            assignedAt: new Date(),
          },
        });

        // Reconfigure ElevenLabs
        if (agent.elevenLabsAgentId) {
          try {
            // Import new phone number to ElevenLabs
            const importResult = await elevenLabsService.importTwilioPhoneNumber(
              backupNumber.phoneNumber,
              `${agent.name} - ${agent.businessName}`
            );

            // Assign to agent
            await elevenLabsService.assignPhoneNumberToAgent(
              importResult.phone_number_id,
              agent.elevenLabsAgentId
            );

            // Update agent with new ElevenLabs phone ID
            await prisma.voiceAgent.update({
              where: { id: agent.id },
              data: {
                elevenLabsPhoneNumberId: importResult.phone_number_id,
              },
            });
          } catch (error) {
            console.error(`Failed to reconfigure ElevenLabs for agent ${agent.id}:`, error);
            // Continue with other agents
          }
        }

        // Update Twilio webhook
        try {
          const twilioClient = twilio(
            event.toAccount.accountSid,
            event.toAccount.authToken // Should decrypt
          );

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '';
          const webhookUrl = `${appUrl}/api/twilio/voice-callback`;

          await twilioClient.incomingPhoneNumbers(backupNumber.phoneNumber).update({
            voiceUrl: webhookUrl,
            voiceMethod: 'POST',
            statusCallback: `${appUrl}/api/twilio/call-status`,
            statusCallbackMethod: 'POST',
          });
        } catch (error) {
          console.error(`Failed to update webhook for ${backupNumber.phoneNumber}:`, error);
          // Continue with other agents
        }
      }

      // Mark failover as completed
      await prisma.twilioFailoverEvent.update({
        where: { id: failoverEventId },
        data: {
          status: 'COMPLETED',
          failoverExecutedAt: new Date(),
        },
      });

      // Send notifications
      await this.sendFailoverNotifications(event, agents.length);

      return { success: true, agentsSwitched: agents.length };
    } catch (error: any) {
      // Mark as failed
      await prisma.twilioFailoverEvent.update({
        where: { id: failoverEventId },
        data: {
          status: 'CANCELLED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Rollback failover
   */
  async rollbackFailover(failoverEventId: string, rollbackBy: string) {
    const event = await prisma.twilioFailoverEvent.findUnique({
      where: { id: failoverEventId },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });

    if (!event || event.status !== 'COMPLETED') {
      throw new Error('Failover event not found or not completed');
    }

    // Get agents that were switched
    const agents = await prisma.voiceAgent.findMany({
      where: {
        twilioAccountId: event.toAccountId,
        backupPhoneNumber: { not: null },
      },
    });

    // Switch back to original account and numbers
    for (const agent of agents) {
      await prisma.voiceAgent.update({
        where: { id: agent.id },
        data: {
          twilioAccountId: event.fromAccountId,
          twilioPhoneNumber: agent.backupPhoneNumber,
          backupPhoneNumber: null,
        },
      });

      // Unassign backup number
      await prisma.twilioBackupPhoneNumber.updateMany({
        where: {
          assignedToAgentId: agent.id,
        },
        data: {
          isAssigned: false,
          assignedToAgentId: null,
          assignedAt: null,
        },
      });
    }

    // Update event
    await prisma.twilioFailoverEvent.update({
      where: { id: failoverEventId },
      data: {
        rollbackAt: new Date(),
        rollbackBy,
      },
    });
  }

  /**
   * Send failover notifications
   */
  private async sendFailoverNotifications(event: any, agentsCount: number) {
    const { twilioFailoverNotifications } = await import('./notifications');
    
    await twilioFailoverNotifications.sendFailoverNotification({
      eventId: event.id,
      triggerType: event.triggerType,
      fromAccountName: event.fromAccount?.name || 'Unknown',
      toAccountName: event.toAccount?.name || 'Unknown',
      affectedAgents: agentsCount,
      status: event.status,
      reason: event.notes || undefined,
    });

    if (event.status === 'COMPLETED') {
      await twilioFailoverNotifications.sendFailoverCompletionNotification({
        eventId: event.id,
        triggerType: event.triggerType,
        fromAccountName: event.fromAccount?.name || 'Unknown',
        toAccountName: event.toAccount?.name || 'Unknown',
        affectedAgents: agentsCount,
        status: event.status,
      });
    }
  }
}

export const twilioFailoverService = new TwilioFailoverService();
