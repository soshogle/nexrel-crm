/**
 * AI Employee Orchestration System
 * Manages the lifecycle of AI employees and their jobs
 */

import { prisma } from './db';
import { AIEmployeeType, AIJobStatus, AIJobPriority } from '@prisma/client';

// Job type definitions
export type JobInput = Record<string, any>;
export type JobOutput = Record<string, any>;

export interface CreateJobOptions {
  userId: string;
  employeeType: AIEmployeeType;
  jobType: string;
  input: JobInput;
  priority?: AIJobPriority;
  workflowId?: string;
  estimatedTime?: number;
}

export interface JobProgress {
  jobId: string;
  status: AIJobStatus;
  progress: number;
  message?: string;
}

export class AIEmployeeOrchestrator {
  /**
   * Create or get an AI employee for the user
   */
  async ensureEmployee(userId: string, type: AIEmployeeType) {
    const employeeConfig = this.getEmployeeConfig(type);
    
    // Check if employee already exists
    let employee = await prisma.aIEmployee.findFirst({
      where: {
        userId,
        type,
        isActive: true
      }
    });

    if (!employee) {
      // Create new employee
      employee = await prisma.aIEmployee.create({
        data: {
          userId,
          type,
          name: employeeConfig.name,
          description: employeeConfig.description,
          capabilities: employeeConfig.capabilities,
          isActive: true
        }
      });
      console.log(`✨ Created AI Employee: ${employee.name}`);
    }

    return employee;
  }

  /**
   * Create a new job for an AI employee
   */
  async createJob(options: CreateJobOptions) {
    const { userId, employeeType, jobType, input, priority, workflowId, estimatedTime } = options;

    // Ensure the employee exists
    const employee = await this.ensureEmployee(userId, employeeType);

    // Create the job
    const job = await prisma.aIJob.create({
      data: {
        userId,
        employeeId: employee.id,
        workflowId,
        jobType,
        priority: priority || AIJobPriority.MEDIUM,
        status: AIJobStatus.PENDING,
        input,
        estimatedTime,
        progress: 0
      },
      include: {
        employee: true
      }
    });

    await this.logJob(job.id, 'INFO', `Job created: ${jobType}`);

    console.log(`📋 Created job: ${job.id} for ${employee.name}`);

    return job;
  }

  /**
   * Start executing a job
   */
  async startJob(jobId: string) {
    const job = await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: AIJobStatus.RUNNING,
        startedAt: new Date(),
        progress: 0
      }
    });

    await this.logJob(jobId, 'INFO', 'Job execution started');

    return job;
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number, message?: string) {
    await prisma.aIJob.update({
      where: { id: jobId },
      data: { progress: Math.min(100, Math.max(0, progress)) }
    });

    if (message) {
      await this.logJob(jobId, 'INFO', message);
    }
  }

  /**
   * Complete a job successfully
   */
  async completeJob(jobId: string, output: JobOutput) {
    const job = await prisma.aIJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new Error('Job not found');
    }

    const actualTime = job.startedAt 
      ? Math.floor((Date.now() - job.startedAt.getTime()) / 1000)
      : 0;

    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: AIJobStatus.COMPLETED,
        output,
        progress: 100,
        completedAt: new Date(),
        actualTime
      }
    });

    await this.logJob(jobId, 'SUCCESS', 'Job completed successfully', output);

    console.log(`✅ Job completed: ${jobId} (${actualTime}s)`);

    return output;
  }

  /**
   * Fail a job with error
   */
  async failJob(jobId: string, error: string) {
    const job = await prisma.aIJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new Error('Job not found');
    }

    const shouldRetry = job.retryCount < job.maxRetries;

    if (shouldRetry) {
      // Retry the job
      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          status: AIJobStatus.PENDING,
          error,
          retryCount: job.retryCount + 1,
          progress: 0
        }
      });

      await this.logJob(jobId, 'WARNING', `Job failed, retrying (${job.retryCount + 1}/${job.maxRetries})`, { error });
      
      console.log(`⚠️  Job failed, retrying: ${jobId} (${job.retryCount + 1}/${job.maxRetries})`);
    } else {
      // Final failure
      const actualTime = job.startedAt 
        ? Math.floor((Date.now() - job.startedAt.getTime()) / 1000)
        : 0;

      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          status: AIJobStatus.FAILED,
          error,
          completedAt: new Date(),
          actualTime
        }
      });

      await this.logJob(jobId, 'ERROR', 'Job failed permanently', { error });
      
      console.error(`❌ Job failed permanently: ${jobId}`);
    }
  }

  /**
   * Log a job event
   */
  async logJob(jobId: string, level: string, message: string, data?: any) {
    await prisma.aIJobLog.create({
      data: {
        jobId,
        level,
        message,
        data: data || {}
      }
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    const job = await prisma.aIJob.findUnique({
      where: { id: jobId },
      include: {
        employee: true,
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    return job;
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(userId: string, options?: {
    status?: AIJobStatus;
    limit?: number;
    workflowId?: string;
  }) {
    const where: any = { userId };
    
    if (options?.status) {
      where.status = options.status;
    }
    
    if (options?.workflowId) {
      where.workflowId = options.workflowId;
    }

    const jobs = await prisma.aIJob.findMany({
      where,
      select: {
        id: true,
        jobType: true,
        status: true,
        progress: true,
        input: true,
        output: true,
        error: true,
        createdAt: true,
        completedAt: true,
        employee: {
          select: {
            name: true,
            type: true
          }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { message: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50
    });

    // Map progressMessage from latest log
    return jobs.map((j: any) => ({
      ...j,
      progressMessage: j.logs?.[0]?.message || null,
      logs: undefined
    }));
  }

  /**
   * Get jobs for a workflow
   */
  async getWorkflowJobs(workflowId: string) {
    const jobs = await prisma.aIJob.findMany({
      where: { workflowId },
      include: {
        employee: true,
        logs: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return jobs;
  }

  /**
   * Get configuration for different employee types
   */
  private getEmployeeConfig(type: AIEmployeeType) {
    const configs = {
      [AIEmployeeType.LEAD_RESEARCHER]: {
        name: 'Sarah - Lead Researcher',
        description: 'Researches companies and enriches lead data',
        capabilities: {
          webResearch: true,
          companyAnalysis: true,
          contactDiscovery: true,
          dataEnrichment: true
        }
      },
      [AIEmployeeType.CUSTOMER_ONBOARDING]: {
        name: 'Alex - Customer Success',
        description: 'Handles customer onboarding, invoices, and communications',
        capabilities: {
          invoiceGeneration: true,
          emailAutomation: true,
          recordCreation: true,
          documentGeneration: true
        }
      },
      [AIEmployeeType.BOOKING_COORDINATOR]: {
        name: 'Maya - Booking Coordinator',
        description: 'Manages calendar and booking automation',
        capabilities: {
          calendarManagement: true,
          availabilityChecking: true,
          bookingCreation: true,
          reminderAutomation: true
        }
      },
      [AIEmployeeType.PROJECT_MANAGER]: {
        name: 'David - Project Manager',
        description: 'Creates projects and assigns teams',
        capabilities: {
          projectCreation: true,
          taskManagement: true,
          teamAssignment: true,
          progressTracking: true
        }
      },
      [AIEmployeeType.COMMUNICATION_SPECIALIST]: {
        name: 'Emma - Communications',
        description: 'Sends welcome packages and follow-up communications',
        capabilities: {
          emailTemplates: true,
          smsAutomation: true,
          resourceDelivery: true,
          followUpAutomation: true
        }
      }
    };

    return configs[type] || {
      name: 'AI Employee',
      description: 'Automated assistant',
      capabilities: {}
    };
  }
}

// Export singleton instance
export const aiOrchestrator = new AIEmployeeOrchestrator();
