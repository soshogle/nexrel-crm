/**
 * Real Estate Workflow Execution Engine
 * Handles task execution, scheduling, and agent invocation
 */

import { prisma } from '@/lib/db';
import { hitlNotificationService } from './hitl-notification-service';
import { RE_AGENT_NAMES } from './workflow-templates';
import { RETaskExecutionStatus, REAIEmployeeType } from '@prisma/client';

interface TaskExecutionResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  callLogId?: string;
}

export class REWorkflowEngine {
  /**
   * Process a scheduled task execution
   */
  async processTask(executionId: string): Promise<TaskExecutionResult> {
    try {
      const execution = await prisma.rETaskExecution.findUnique({
        where: { id: executionId },
        include: {
          task: true,
          instance: {
            include: {
              template: true,
              lead: true,
              deal: true,
              user: {
                select: { id: true, email: true, phone: true, name: true }
              }
            }
          }
        }
      });

      if (!execution) {
        return { success: false, error: 'Execution not found' };
      }

      // Check if this is a HITL task
      if (execution.task.isHITL) {
        return await this.handleHITLTask(execution);
      }

      // Update status to in progress
      await prisma.rETaskExecution.update({
        where: { id: executionId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      // Execute the task based on its action config
      const actionConfig = execution.task.actionConfig as {
        actions: string[];
        script?: string;
        template?: string;
        fields?: string[];
      };

      let result: TaskExecutionResult = { success: true };

      // Process each action in the task
      for (const action of actionConfig.actions || []) {
        switch (action) {
          case 'voice_call':
            result = await this.executeVoiceCall(execution);
            break;
          case 'sms':
            result = await this.executeSMS(execution);
            break;
          case 'email':
            result = await this.executeEmail(execution);
            break;
          case 'task':
            result = await this.createTask(execution);
            break;
          case 'calendar':
            result = await this.createCalendarEvent(execution);
            break;
          case 'document':
            result = await this.generateDocument(execution);
            break;
        }

        if (!result.success) {
          break;
        }
      }

      // Update execution status
      await prisma.rETaskExecution.update({
        where: { id: executionId },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          completedAt: new Date(),
          result: (result.result || {}) as object,
          callLogId: result.callLogId || null,
          errorMessage: result.error || null,
          agentUsed: execution.task.assignedAgentType
        }
      });

      // If successful, schedule the next task
      if (result.success) {
        await this.scheduleNextTask(execution);
      }

      return result;
    } catch (error) {
      console.error('Error processing task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle HITL (Human-in-the-Loop) task
   */
  private async handleHITLTask(execution: {
    id: string;
    task: {
      id: string;
      name: string;
      description: string | null;
      assignedAgentType: REAIEmployeeType | null;
    };
    instance: {
      id: string;
      userId: string;
      template: { name: string };
      lead: { businessName: string; contactPerson: string | null; email: string | null; phone: string | null } | null;
      deal: { title: string } | null;
      user: { id: string; email: string | null; phone: string | null; name: string | null };
    };
  }): Promise<TaskExecutionResult> {
    try {
      // Update status to awaiting HITL
      await prisma.rETaskExecution.update({
        where: { id: execution.id },
        data: {
          status: 'AWAITING_HITL',
          startedAt: new Date()
        }
      });

      // Create HITL notification
      await hitlNotificationService.createNotification({
        userId: execution.instance.userId,
        executionId: execution.id,
        taskName: execution.task.name,
        taskDescription: execution.task.description || undefined,
        agentType: execution.task.assignedAgentType,
        contactName: execution.instance.lead?.contactPerson || 
                     execution.instance.lead?.businessName || 
                     undefined,
        contactEmail: execution.instance.lead?.email || undefined,
        contactPhone: execution.instance.lead?.phone || undefined,
        dealAddress: execution.instance.deal?.title || undefined,
        workflowName: execution.instance.template.name,
        urgency: 'HIGH'
      });

      return {
        success: true,
        result: { status: 'awaiting_approval' }
      };
    } catch (error) {
      console.error('Error handling HITL task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create HITL notification'
      };
    }
  }

  /**
   * Schedule the next task in the workflow
   */
  private async scheduleNextTask(execution: {
    id: string;
    taskId: string;
    instanceId: string;
    instance: {
      templateId: string;
    };
  }): Promise<void> {
    // Get all tasks for the workflow
    const tasks = await prisma.rEWorkflowTask.findMany({
      where: { templateId: execution.instance.templateId },
      orderBy: { displayOrder: 'asc' }
    });

    const currentTaskIndex = tasks.findIndex((t: { id: string }) => t.id === execution.taskId);
    const nextTask = tasks[currentTaskIndex + 1];

    if (nextTask) {
      const delayMs = this.calculateDelay(nextTask.delayValue, nextTask.delayUnit);
      const scheduledFor = new Date(Date.now() + delayMs);

      // Update the next task execution
      await prisma.rETaskExecution.updateMany({
        where: {
          instanceId: execution.instanceId,
          taskId: nextTask.id
        },
        data: {
          status: delayMs === 0 ? 'IN_PROGRESS' : 'PENDING',
          scheduledFor,
          startedAt: delayMs === 0 ? new Date() : null
        }
      });

      // Update instance current task
      await prisma.rEWorkflowInstance.update({
        where: { id: execution.instanceId },
        data: { currentTaskId: nextTask.id }
      });

      // If no delay, process immediately
      if (delayMs === 0) {
        const nextExecution = await prisma.rETaskExecution.findFirst({
          where: {
            instanceId: execution.instanceId,
            taskId: nextTask.id
          }
        });
        if (nextExecution) {
          // Process async to not block
          setImmediate(() => this.processTask(nextExecution.id));
        }
      }
    } else {
      // No more tasks, complete the workflow
      await prisma.rEWorkflowInstance.update({
        where: { id: execution.instanceId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * Execute a voice call action
   */
  private async executeVoiceCall(execution: {
    task: {
      assignedAgentType: REAIEmployeeType | null;
      actionConfig: unknown;
    };
    instance: {
      userId: string;
      lead: { id: string; phone: string | null } | null;
    };
  }): Promise<TaskExecutionResult> {
    try {
      const phone = execution.instance.lead?.phone;
      if (!phone) {
        return { success: false, error: 'No phone number available for lead' };
      }

      // Get the RE AI Employee agent for this user
      const agentType = execution.task.assignedAgentType;
      if (!agentType) {
        return { success: false, error: 'No agent assigned to this task' };
      }

      const agent = await prisma.rEAIEmployeeAgent.findUnique({
        where: {
          userId_employeeType: {
            userId: execution.instance.userId,
            employeeType: agentType
          }
        }
      });

      if (!agent || !agent.twilioPhoneNumber) {
        console.log(`Agent ${agentType} not provisioned or has no phone number`);
        // For now, log this as a placeholder - actual voice integration would go here
        return {
          success: true,
          result: {
            action: 'voice_call',
            status: 'agent_not_provisioned',
            agentType,
            targetPhone: phone
          }
        };
      }

      // TODO: Integrate with actual voice calling system
      // For now, create a call log placeholder
      const callLog = await prisma.callLog.create({
        data: {
          userId: execution.instance.userId,
          leadId: execution.instance.lead?.id || null,
          direction: 'outbound',
          status: 'pending',
          fromNumber: agent.twilioPhoneNumber,
          toNumber: phone,
          agentName: RE_AGENT_NAMES[agentType],
          metadata: {
            workflowExecution: true,
            agentType
          }
        } as any
      });

      return {
        success: true,
        callLogId: callLog.id,
        result: {
          action: 'voice_call',
          callLogId: callLog.id,
          agentType,
          agentName: RE_AGENT_NAMES[agentType]
        }
      };
    } catch (error) {
      console.error('Error executing voice call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice call failed'
      };
    }
  }

  /**
   * Execute an SMS action
   */
  private async executeSMS(execution: {
    task: {
      name: string;
      actionConfig: unknown;
    };
    instance: {
      lead: { phone: string | null } | null;
    };
  }): Promise<TaskExecutionResult> {
    try {
      const phone = execution.instance.lead?.phone;
      if (!phone) {
        return { success: false, error: 'No phone number available' };
      }

      // TODO: Send actual SMS via Twilio
      // For now, log as placeholder
      console.log(`[SMS] Would send SMS to ${phone} for task: ${execution.task.name}`);

      return {
        success: true,
        result: {
          action: 'sms',
          targetPhone: phone,
          status: 'logged'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS failed'
      };
    }
  }

  /**
   * Execute an email action
   */
  private async executeEmail(execution: {
    task: {
      name: string;
      actionConfig: unknown;
    };
    instance: {
      lead: { email: string | null } | null;
    };
  }): Promise<TaskExecutionResult> {
    try {
      const email = execution.instance.lead?.email;
      if (!email) {
        return { success: false, error: 'No email available' };
      }

      // TODO: Send actual email
      console.log(`[EMAIL] Would send email to ${email} for task: ${execution.task.name}`);

      return {
        success: true,
        result: {
          action: 'email',
          targetEmail: email,
          status: 'logged'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email failed'
      };
    }
  }

  /**
   * Create a CRM task
   */
  private async createTask(execution: {
    task: { name: string };
    instance: {
      userId: string;
      leadId: string | null;
    };
  }): Promise<TaskExecutionResult> {
    try {
      const task = await prisma.task.create({
        data: {
          userId: execution.instance.userId,
          title: execution.task.name,
          description: `Auto-created by workflow`,
          status: 'pending',
          priority: 'medium',
          leadId: execution.instance.leadId
        } as any
      });

      return {
        success: true,
        result: {
          action: 'task',
          taskId: task.id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Task creation failed'
      };
    }
  }

  /**
   * Create a calendar event
   */
  private async createCalendarEvent(execution: {
    task: { name: string };
    instance: { userId: string };
  }): Promise<TaskExecutionResult> {
    try {
      // TODO: Create actual calendar event
      console.log(`[CALENDAR] Would create event for: ${execution.task.name}`);

      return {
        success: true,
        result: {
          action: 'calendar',
          status: 'logged'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar event failed'
      };
    }
  }

  /**
   * Generate a document
   */
  private async generateDocument(execution: {
    task: { name: string; actionConfig: unknown };
    instance: { userId: string };
  }): Promise<TaskExecutionResult> {
    try {
      const actionConfig = execution.task.actionConfig as { template?: string };
      
      // TODO: Generate actual document based on template
      console.log(`[DOCUMENT] Would generate document: ${actionConfig.template || 'unknown'}`);

      return {
        success: true,
        result: {
          action: 'document',
          template: actionConfig.template,
          status: 'logged'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document generation failed'
      };
    }
  }

  /**
   * Calculate delay in milliseconds
   */
  private calculateDelay(value: number, unit: string): number {
    switch (unit) {
      case 'MINUTES':
        return value * 60 * 1000;
      case 'HOURS':
        return value * 60 * 60 * 1000;
      case 'DAYS':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Get workflow statistics for a user
   */
  async getWorkflowStats(userId: string): Promise<{
    totalWorkflows: number;
    activeInstances: number;
    completedInstances: number;
    pendingApprovals: number;
  }> {
    const [totalWorkflows, activeInstances, completedInstances, pendingApprovals] = await Promise.all([
      prisma.rEWorkflowTemplate.count({ where: { userId } }),
      prisma.rEWorkflowInstance.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.rEWorkflowInstance.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.rETaskExecution.count({
        where: {
          instance: { userId },
          status: 'AWAITING_HITL'
        }
      })
    ]);

    return {
      totalWorkflows,
      activeInstances,
      completedInstances,
      pendingApprovals
    };
  }
}

export const reWorkflowEngine = new REWorkflowEngine();
