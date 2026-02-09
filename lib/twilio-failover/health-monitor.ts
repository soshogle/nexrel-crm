/**
 * Twilio Health Monitoring Service
 * Monitors Twilio account health and detects failures
 * Only monitors active ElevenLabs agents
 */

import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';
import twilio from 'twilio';

interface HealthCheckResult {
  type: 'API' | 'WEBHOOK' | 'PHONE_NUMBER' | 'AGENT' | 'ACCOUNT_STATUS';
  status: 'PASS' | 'FAIL' | 'DEGRADED';
  details: any;
  responseTime?: number;
}

interface AgentHealthStatus {
  agentId: string;
  agentName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  issues: string[];
  lastCheck: Date;
}

export class TwilioHealthMonitor {
  /**
   * Get all active agents eligible for monitoring
   * Only includes agents that are:
   * - Active in database (status = 'ACTIVE')
   * - Have elevenLabsAgentId set
   * - Have twilioPhoneNumber set
   * - Verified active in ElevenLabs API
   */
  async getActiveEligibleAgents() {
    // Get agents from database
    const dbAgents = await prisma.voiceAgent.findMany({
      where: {
        status: 'ACTIVE',
        elevenLabsAgentId: { not: null },
        twilioPhoneNumber: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        twilioAccount: true,
      },
    });

    // Verify each agent is active in ElevenLabs
    const eligibleAgents = [];
    for (const agent of dbAgents) {
      try {
        if (!agent.elevenLabsAgentId) continue;

        const elevenLabsAgent = await elevenLabsService.getAgent(agent.elevenLabsAgentId);
        
        // Check if agent has phone number assigned in ElevenLabs
        if (elevenLabsAgent.phone_number_id) {
          eligibleAgents.push({
            ...agent,
            elevenLabsVerified: true,
            elevenLabsPhoneNumberId: elevenLabsAgent.phone_number_id,
          });
        }
      } catch (error) {
        console.warn(`Agent ${agent.id} not found in ElevenLabs or error:`, error);
        // Don't include agents that can't be verified in ElevenLabs
      }
    }

    return eligibleAgents;
  }

  /**
   * Check Twilio account health
   */
  async checkAccountHealth(
    accountSid: string,
    authToken: string
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const client = twilio(accountSid, authToken);

      // Test API connectivity
      const account = await client.api.accounts(accountSid).fetch();
      const responseTime = Date.now() - startTime;

      // Check account status
      if (account.status === 'closed' || account.status === 'suspended') {
        return {
          type: 'ACCOUNT_STATUS',
          status: 'FAIL',
          details: {
            accountStatus: account.status,
            error: `Account is ${account.status}`,
          },
          responseTime,
        };
      }

      return {
        type: 'API',
        status: 'PASS',
        details: {
          accountStatus: account.status,
          accountName: account.friendlyName,
        },
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Check for authentication errors (account hacked)
      if (error.status === 401 || error.status === 403) {
        return {
          type: 'ACCOUNT_STATUS',
          status: 'FAIL',
          details: {
            error: error.message,
            statusCode: error.status,
            critical: true, // Account hacked or suspended
          },
          responseTime,
        };
      }

      return {
        type: 'API',
        status: 'FAIL',
        details: {
          error: error.message,
          statusCode: error.status,
        },
        responseTime,
      };
    }
  }

  /**
   * Check phone number status
   */
  async checkPhoneNumberStatus(
    accountSid: string,
    authToken: string,
    phoneNumber: string
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const client = twilio(accountSid, authToken);

      // Get all phone numbers for this account
      const phoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber,
        limit: 1,
      });

      const responseTime = Date.now() - startTime;

      if (phoneNumbers.length === 0) {
        return {
          type: 'PHONE_NUMBER',
          status: 'FAIL',
          details: {
            phoneNumber,
            error: 'Phone number not found in account',
          },
          responseTime,
        };
      }

      const number = phoneNumbers[0];
      if (number.status === 'released' || number.status === 'deleted') {
        return {
          type: 'PHONE_NUMBER',
          status: 'FAIL',
          details: {
            phoneNumber,
            status: number.status,
            error: `Phone number is ${number.status}`,
          },
          responseTime,
        };
      }

      return {
        type: 'PHONE_NUMBER',
        status: 'PASS',
        details: {
          phoneNumber,
          status: number.status,
          voiceUrl: number.voiceUrl,
        },
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        type: 'PHONE_NUMBER',
        status: 'FAIL',
        details: {
          phoneNumber,
          error: error.message,
        },
        responseTime,
      };
    }
  }

  /**
   * Check agent health (database + ElevenLabs + Twilio)
   */
  async checkAgentHealth(agent: any): Promise<AgentHealthStatus> {
    const issues: string[] = [];
    let status: 'HEALTHY' | 'DEGRADED' | 'FAILED' = 'HEALTHY';

    try {
      // Check ElevenLabs agent
      if (!agent.elevenLabsAgentId) {
        issues.push('No ElevenLabs Agent ID');
        status = 'FAILED';
      } else {
        try {
          const elevenLabsAgent = await elevenLabsService.getAgent(agent.elevenLabsAgentId);
          if (!elevenLabsAgent.phone_number_id) {
            issues.push('No phone number assigned in ElevenLabs');
            status = 'DEGRADED';
          }
        } catch (error) {
          issues.push('ElevenLabs agent not found or error');
          status = 'FAILED';
        }
      }

      // Check Twilio phone number if account is set
      if (agent.twilioAccount && agent.twilioPhoneNumber) {
        try {
          const phoneCheck = await this.checkPhoneNumberStatus(
            agent.twilioAccount.accountSid,
            agent.twilioAccount.authToken, // Note: This should be decrypted
            agent.twilioPhoneNumber
          );

          if (phoneCheck.status === 'FAIL') {
            issues.push(`Phone number issue: ${phoneCheck.details.error}`);
            status = status === 'HEALTHY' ? 'DEGRADED' : 'FAILED';
          }
        } catch (error: any) {
          issues.push(`Twilio phone check error: ${error.message}`);
          status = 'DEGRADED';
        }
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        status,
        issues,
        lastCheck: new Date(),
      };
    } catch (error: any) {
      return {
        agentId: agent.id,
        agentName: agent.name,
        status: 'FAILED',
        issues: [`Health check error: ${error.message}`],
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Run comprehensive health check for all active agents
   */
  async runHealthCheck(twilioAccountId: string): Promise<{
    accountHealth: HealthCheckResult;
    agentsHealth: AgentHealthStatus[];
    summary: {
      totalAgents: number;
      healthyAgents: number;
      degradedAgents: number;
      failedAgents: number;
      failureRate: number;
    };
  }> {
    // Get Twilio account
    const account = await prisma.twilioAccount.findUnique({
      where: { id: twilioAccountId },
    });

    if (!account) {
      throw new Error('Twilio account not found');
    }

    // Check account health
    const accountHealth = await this.checkAccountHealth(
      account.accountSid,
      account.authToken // Note: Should decrypt this
    );

    // Get eligible agents
    const eligibleAgents = await this.getActiveEligibleAgents();

    // Filter agents for this account
    const accountAgents = eligibleAgents.filter(
      (agent) => agent.twilioAccountId === twilioAccountId
    );

    // Check each agent
    const agentsHealth = await Promise.all(
      accountAgents.map((agent) => this.checkAgentHealth(agent))
    );

    // Calculate summary
    const healthyAgents = agentsHealth.filter((a) => a.status === 'HEALTHY').length;
    const degradedAgents = agentsHealth.filter((a) => a.status === 'DEGRADED').length;
    const failedAgents = agentsHealth.filter((a) => a.status === 'FAILED').length;
    const totalAgents = agentsHealth.length;
    const failureRate = totalAgents > 0 ? (failedAgents + degradedAgents) / totalAgents : 0;

    // Store health check results
    await prisma.twilioHealthCheck.createMany({
      data: [
        {
          twilioAccountId: account.id,
          checkType: accountHealth.type as any,
          status: accountHealth.status as any,
          details: accountHealth.details,
          responseTime: accountHealth.responseTime,
        },
        ...agentsHealth.map((agent) => ({
          twilioAccountId: account.id,
          checkType: 'AGENT' as any,
          status: agent.status === 'HEALTHY' ? 'PASS' : agent.status === 'DEGRADED' ? 'DEGRADED' : 'FAIL' as any,
          details: {
            agentId: agent.agentId,
            agentName: agent.agentName,
            issues: agent.issues,
          },
        })),
      ],
    });

    // Update account health status
    await prisma.twilioAccount.update({
      where: { id: twilioAccountId },
      data: {
        lastHealthCheck: new Date(),
        healthStatus: accountHealth.status === 'FAIL' ? 'FAILED' : failureRate > 0.5 ? 'DEGRADED' : 'HEALTHY',
      },
    });

    // Update agent health status
    for (const agentHealth of agentsHealth) {
      await prisma.voiceAgent.update({
        where: { id: agentHealth.agentId },
        data: {
          lastHealthCheck: agentHealth.lastCheck,
          healthStatus: agentHealth.status,
        },
      });
    }

    return {
      accountHealth,
      agentsHealth,
      summary: {
        totalAgents,
        healthyAgents,
        degradedAgents,
        failedAgents,
        failureRate,
      },
    };
  }

  /**
   * Detect if failover should be triggered
   */
  async detectFailoverNeeded(twilioAccountId: string): Promise<{
    shouldFailover: boolean;
    triggerType: 'CRITICAL' | 'DEGRADED' | null;
    reason: string;
    affectedAgents: number;
    totalAgents: number;
  }> {
    const healthCheck = await this.runHealthCheck(twilioAccountId);

    // Critical failure: Account hacked, suspended, or API completely down
    if (
      healthCheck.accountHealth.status === 'FAIL' &&
      healthCheck.accountHealth.details.critical
    ) {
      return {
        shouldFailover: true,
        triggerType: 'CRITICAL',
        reason: `Account ${healthCheck.accountHealth.details.error}`,
        affectedAgents: healthCheck.summary.totalAgents,
        totalAgents: healthCheck.summary.totalAgents,
      };
    }

    // Degraded failure: Multiple agents failing (≥50% or ≥2 agents)
    const failureCount = healthCheck.summary.failedAgents + healthCheck.summary.degradedAgents;
    const failureRate = healthCheck.summary.failureRate;

    if (
      (failureRate >= 0.5 || failureCount >= 2) &&
      healthCheck.summary.totalAgents >= 2
    ) {
      return {
        shouldFailover: true,
        triggerType: 'DEGRADED',
        reason: `${failureCount} out of ${healthCheck.summary.totalAgents} agents failing (${(failureRate * 100).toFixed(0)}% failure rate)`,
        affectedAgents: failureCount,
        totalAgents: healthCheck.summary.totalAgents,
      };
    }

    // Single agent/number issue - don't failover
    if (failureCount === 1 && healthCheck.summary.totalAgents > 1) {
      return {
        shouldFailover: false,
        triggerType: null,
        reason: 'Single agent issue - no failover needed',
        affectedAgents: failureCount,
        totalAgents: healthCheck.summary.totalAgents,
      };
    }

    return {
      shouldFailover: false,
      triggerType: null,
      reason: 'No issues detected',
      affectedAgents: 0,
      totalAgents: healthCheck.summary.totalAgents,
    };
  }
}

export const twilioHealthMonitor = new TwilioHealthMonitor();
