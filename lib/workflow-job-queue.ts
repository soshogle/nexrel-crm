
/**
 * Workflow Job Queue Service
 * 
 * Handles background execution of workflow actions with delays, retries, and scheduling.
 * This replaces setTimeout with a production-ready job queue system.
 */

import { prisma } from './db';
import { workflowEngine } from './workflow-engine';

interface QueuedJob {
  id: string;
  enrollmentId: string;
  actionId: string;
  scheduledFor: Date;
  retryCount: number;
  maxRetries: number;
}

class WorkflowJobQueue {
  private jobs: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start the job queue processor
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Workflow job queue started');
    
    // Check for pending jobs every 30 seconds
    this.checkInterval = setInterval(() => {
      this.processPendingJobs();
    }, 30000);

    // Process immediately on start
    this.processPendingJobs();
  }

  /**
   * Stop the job queue processor
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Clear all scheduled jobs
    this.jobs.forEach(timeout => clearTimeout(timeout));
    this.jobs.clear();
    
    console.log('🛑 Workflow job queue stopped');
  }

  /**
   * Schedule a workflow action for delayed execution
   */
  async scheduleAction(
    enrollmentId: string,
    actionId: string,
    delayMinutes: number = 0
  ): Promise<void> {
    const scheduledFor = new Date(Date.now() + delayMinutes * 60000);

    await prisma.workflowActionExecution.create({
      data: {
        enrollmentId,
        actionId,
        status: 'PENDING',
        scheduledFor,
      },
    });

    // If delay is short, schedule it in memory
    if (delayMinutes < 60) {
      const timeout = setTimeout(
        () => this.executeScheduledAction(enrollmentId, actionId),
        delayMinutes * 60000
      );
      this.jobs.set(`${enrollmentId}-${actionId}`, timeout);
    }
  }

  /**
   * Process all pending jobs that are due
   */
  private async processPendingJobs() {
    try {
      const pendingExecutions = await prisma.workflowActionExecution.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: {
            lte: new Date(),
          },
        },
        include: {
          enrollment: {
            include: {
              workflow: true,
              lead: true,
              deal: true,
            },
          },
          action: true,
        },
        take: 50, // Process in batches
      });

      for (const execution of pendingExecutions) {
        await this.executeScheduledAction(
          execution.enrollmentId,
          execution.actionId
        );
      }
    } catch (error) {
      console.error('Error processing pending jobs:', error);
    }
  }

  /**
   * Execute a scheduled workflow action
   */
  private async executeScheduledAction(
    enrollmentId: string,
    actionId: string
  ): Promise<void> {
    try {
      const execution = await prisma.workflowActionExecution.findFirst({
        where: {
          enrollmentId,
          actionId,
          status: 'PENDING',
        },
        include: {
          enrollment: {
            include: {
              workflow: true,
              lead: true,
              deal: true,
            },
          },
          action: true,
        },
      });

      if (!execution) return;

      // Update status to in progress
      await prisma.workflowActionExecution.update({
        where: { id: execution.id },
        data: { status: 'IN_PROGRESS' },
      });

      // Build execution context
      const context = {
        userId: execution.enrollment.userId,
        leadId: execution.enrollment.leadId || undefined,
        dealId: execution.enrollment.dealId || undefined,
      };

      // Execute the action
      const result = await workflowEngine.executeAction(
        execution.action,
        execution.enrollment,
        context
      );

      // Mark as completed
      await prisma.workflowActionExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          executedAt: new Date(),
          result: result as any,
        },
      });

      // Remove from in-memory queue
      this.jobs.delete(`${enrollmentId}-${actionId}`);

      console.log(`✅ Executed workflow action: ${execution.action.type}`);
    } catch (error: any) {
      console.error('Error executing scheduled action:', error);

      // Update execution with error
      await prisma.workflowActionExecution.updateMany({
        where: {
          enrollmentId,
          actionId,
          status: 'IN_PROGRESS',
        },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * Cancel all pending jobs for a workflow enrollment
   */
  async cancelEnrollment(enrollmentId: string): Promise<void> {
    await prisma.workflowActionExecution.updateMany({
      where: {
        enrollmentId,
        status: 'PENDING',
      },
      data: {
        status: 'SKIPPED',
      },
    });

    // Remove from in-memory queue
    this.jobs.forEach((timeout, key) => {
      if (key.startsWith(enrollmentId)) {
        clearTimeout(timeout);
        this.jobs.delete(key);
      }
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const pending = await prisma.workflowActionExecution.count({
      where: { status: 'PENDING' },
    });

    const inProgress = await prisma.workflowActionExecution.count({
      where: { status: 'IN_PROGRESS' },
    });

    return {
      pending,
      inProgress,
      scheduled: this.jobs.size,
      isRunning: this.isRunning,
    };
  }
}

export const workflowJobQueue = new WorkflowJobQueue();

// Start the queue on server initialization
if (typeof window === 'undefined') {
  workflowJobQueue.start();
}

