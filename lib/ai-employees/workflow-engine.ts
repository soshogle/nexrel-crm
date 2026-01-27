/**
 * Multi-Agent Workflow Engine
 * Orchestrates multiple AI employees working together in sequence
 */

import { prisma } from '../db';
import { aiOrchestrator } from '../ai-employee-orchestrator';
import { AIEmployeeType, AIJobPriority } from '@prisma/client';
import { customerOnboardingAgent } from './customer-onboarding';
import { bookingCoordinator} from './booking-coordinator';
import { projectManager } from './project-manager';
import { communicationSpecialist } from './communication-specialist';

interface WorkflowStepConfig {
  id: string;
  enabled: boolean;
  action: string;
}

interface WorkflowInput {
  userId: string;
  triggerType: 'purchase' | 'signup' | 'lead_created' | 'custom';
  data: Record<string, any>;
  workflowConfig?: WorkflowStepConfig[] | null;
}

interface WorkflowOutput {
  workflowId: string;
  status: 'completed' | 'failed' | 'running';
  results: Record<string, any>;
  jobs: Array<{
    jobId: string;
    employeeType: AIEmployeeType;
    status: string;
    output?: any;
  }>;
}

export class WorkflowEngine {
  /**
   * Get step config helper
   */
  private getStepConfig(config: WorkflowStepConfig[] | null | undefined, stepId: string): { enabled: boolean; action: string } {
    if (!config) return { enabled: true, action: 'default' };
    const step = config.find(s => s.id === stepId);
    return step || { enabled: true, action: 'default' };
  }

  /**
   * Execute complete customer onboarding workflow
   * 4 AI employees working together - now configurable
   */
  async executeOnboardingWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
    const { userId, data, workflowConfig } = input;
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 Starting onboarding workflow: ${workflowId}`);
    if (workflowConfig) {
      console.log(`📋 Workflow Config:`, JSON.stringify(workflowConfig, null, 2));
    }

    const results: Record<string, any> = {};
    const jobs: WorkflowOutput['jobs'] = [];

    try {
      // STEP 1: Customer Onboarding (Alex)
      const onboardingConfig = this.getStepConfig(workflowConfig, 'onboarding');
      let onboardingResult: any = null;
      
      if (onboardingConfig.enabled) {
        console.log('\n🧑‍💼 AI Employee #1: Alex (Customer Success) - Starting onboarding...');
        onboardingResult = await customerOnboardingAgent.onboard({
          userId,
          customerData: data.customer || {},
          purchaseData: data.purchase || {},
          workflowId
        });

        jobs.push({
          jobId: onboardingResult.jobId,
          employeeType: AIEmployeeType.CUSTOMER_ONBOARDING,
          status: 'completed',
          output: onboardingResult
        });

        results.onboarding = onboardingResult;
        console.log('✅ Employee #1 completed: Customer record created, invoice generated');
      } else {
        console.log('\n⏭️ Skipping Employee #1: Alex (Customer Onboarding) - disabled');
      }

      // STEP 2: Send Notification (Emma) - configurable action
      const notificationConfig = this.getStepConfig(workflowConfig, 'notification');
      
      if (notificationConfig.enabled) {
        const customerId = onboardingResult?.customerId || 'temp_' + Date.now();
        console.log(`\n📧 AI Employee #2: Emma (Communications) - Action: ${notificationConfig.action}`);
        
        const communicationResult = await communicationSpecialist.sendWelcomePackage({
          userId,
          customerId,
          customerEmail: data.customer?.email,
          customerName: data.customer?.name,
          packageType: 'full_onboarding',
          notificationType: notificationConfig.action as 'email' | 'sms' | 'voice_call',
          workflowId
        });

        jobs.push({
          jobId: communicationResult.jobId,
          employeeType: AIEmployeeType.COMMUNICATION_SPECIALIST,
          status: 'completed',
          output: { ...communicationResult, actionUsed: notificationConfig.action }
        });

        results.communication = { ...communicationResult, actionUsed: notificationConfig.action };
        console.log(`✅ Employee #2 completed: ${notificationConfig.action === 'voice_call' ? 'Voice call initiated' : notificationConfig.action === 'sms' ? 'SMS sent' : 'Email sent'}`);
      } else {
        console.log('\n⏭️ Skipping Employee #2: Emma (Notification) - disabled');
      }

      // STEP 3: Booking Coordinator (Maya)
      const bookingConfig = this.getStepConfig(workflowConfig, 'booking');
      let bookingResult: any = null;
      
      if (bookingConfig.enabled && bookingConfig.action !== 'skip') {
        console.log('\n📅 AI Employee #3: Maya (Booking Coordinator) - Finding available slots...');
        const customerId = onboardingResult?.customerId || 'temp_' + Date.now();
        
        bookingResult = await bookingCoordinator.scheduleAppointment({
          userId,
          customerId,
          customerEmail: data.customer?.email,
          customerName: data.customer?.name,
          serviceType: data.purchase?.serviceType || 'consultation',
          workflowId
        });

        jobs.push({
          jobId: bookingResult.jobId,
          employeeType: AIEmployeeType.BOOKING_COORDINATOR,
          status: 'completed',
          output: bookingResult
        });

        results.booking = bookingResult;
        console.log('✅ Employee #3 completed: Available slots found, booking link sent');
      } else {
        console.log('\n⏭️ Skipping Employee #3: Maya (Booking) - disabled or skipped');
      }

      // STEP 4: Project Manager (David)
      const projectConfig = this.getStepConfig(workflowConfig, 'project');
      
      if (projectConfig.enabled && projectConfig.action !== 'skip') {
        console.log('\n📊 AI Employee #4: David (Project Manager) - Creating project...');
        const customerId = onboardingResult?.customerId || 'temp_' + Date.now();
        
        const projectResult = await projectManager.createProject({
          userId,
          customerId,
          projectData: {
            name: `${data.customer?.name || 'Customer'} - ${data.purchase?.serviceType || 'Project'}`,
            description: data.purchase?.description || 'New customer project',
            serviceType: data.purchase?.serviceType,
            budget: data.purchase?.amount
          },
          workflowId
        });

        jobs.push({
          jobId: projectResult.jobId,
          employeeType: AIEmployeeType.PROJECT_MANAGER,
          status: 'completed',
          output: projectResult
        });

        results.project = projectResult;
        console.log('✅ Employee #4 completed: Project created, tasks set up');
      } else {
        console.log('\n⏭️ Skipping Employee #4: David (Project) - disabled or skipped');
      }

      console.log(`\n✨ Workflow completed successfully: ${workflowId}`);
      console.log(`   Steps completed: ${jobs.length}`);
      console.log(`   Total time: ${this.calculateTotalTime(jobs)} seconds`);

      return {
        workflowId,
        status: 'completed',
        results,
        jobs
      };

    } catch (error: any) {
      console.error(`❌ Workflow failed: ${workflowId}`, error);

      return {
        workflowId,
        status: 'failed',
        results: {
          error: error.message,
          ...results
        },
        jobs
      };
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string) {
    const jobs = await aiOrchestrator.getWorkflowJobs(workflowId);

    const status = jobs.every(j => j.status === 'COMPLETED') ? 'completed'
      : jobs.some(j => j.status === 'FAILED') ? 'failed'
      : 'running';

    return {
      workflowId,
      status,
      jobs: jobs.map(j => ({
        jobId: j.id,
        employeeType: j.employee.type,
        jobType: j.jobType,
        status: j.status,
        progress: j.progress,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
        output: j.output
      })),
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'COMPLETED').length,
      failedJobs: jobs.filter(j => j.status === 'FAILED').length
    };
  }

  /**
   * Calculate total workflow execution time
   */
  private calculateTotalTime(jobs: any[]): number {
    return jobs.reduce((total, job) => {
      return total + (job.output?.executionTime || 0);
    }, 0);
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();
