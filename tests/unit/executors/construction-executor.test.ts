/**
 * Unit Tests for Construction Industry Executor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeConstructionAction } from '@/lib/workflows/industry-executors/construction-executor';
import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email-service';
import type { WorkflowTask, WorkflowInstance } from '@prisma/client';

// Mocks are already set up in tests/setup.ts

describe('Construction Executor', () => {
  const mockTask: Partial<WorkflowTask> = {
    id: 'task-1',
    name: 'Estimate Task',
    description: 'Generate estimate',
    taskType: 'ESTIMATE_GENERATION',
    actionConfig: {
      actions: ['estimate_generation'],
      projectType: 'Home Renovation',
      estimatedCost: 50000,
    },
  };

  const mockInstance: Partial<WorkflowInstance> = {
    id: 'instance-1',
    userId: 'user-1',
    industry: 'CONSTRUCTION',
    leadId: 'lead-1',
  };

  const mockLead = {
    id: 'lead-1',
    contactPerson: 'Bob Builder',
    businessName: 'Builder Co',
    email: 'bob@example.com',
  };

  const mockPipelineWithStages = {
    id: 'pipeline-1',
    userId: 'user-1',
    name: 'Default Pipeline',
    isDefault: true,
    stages: [
      { id: 'stage-1', name: 'Prospecting', displayOrder: 0, probability: 10 },
      { id: 'stage-2', name: 'Estimate', displayOrder: 1, probability: 50 },
      { id: 'stage-3', name: 'Won', displayOrder: 2, probability: 100 },
    ],
  };

  const mockPipelineWithScheduledStage = {
    ...mockPipelineWithStages,
    stages: [
      { id: 'stage-1', name: 'Prospecting', displayOrder: 0, probability: 10 },
      { id: 'stage-2', name: 'Scheduled', displayOrder: 1, probability: 75 },
      { id: 'stage-3', name: 'Won', displayOrder: 2, probability: 100 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.deal.create as any).mockResolvedValue({
      id: 'deal-1',
      title: 'Estimate: Home Renovation',
      value: 50000,
    });
    (prisma.task.create as any).mockResolvedValue({ id: 'task-created-1' });
    (prisma.pipeline.findFirst as any).mockResolvedValue(mockPipelineWithStages);
  });

  describe('estimate_generation', () => {
    it('should generate estimate and create deal', async () => {
      const result = await executeConstructionAction(
        'estimate_generation',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.estimateId).toBeDefined();
      expect(result.data?.estimatedCost).toBe(50000);
      expect(prisma.deal.create).toHaveBeenCalled();
      expect(prisma.task.create).toHaveBeenCalled();
    });
  });

  describe('project_scheduling', () => {
    it('should schedule project and create deal', async () => {
      (prisma.pipeline.findFirst as any).mockResolvedValue(mockPipelineWithScheduledStage);
      (prisma.bookingAppointment.create as any).mockResolvedValue({
        id: 'appointment-1',
        appointmentDate: new Date('2024-12-25'),
      });

      const result = await executeConstructionAction(
        'project_scheduling',
        {
          ...mockTask,
          actionConfig: {
            actions: ['project_scheduling'],
            startDate: new Date('2024-12-25').toISOString(),
            duration: 30,
            projectType: 'Construction Project',
          },
        } as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.projectId).toBeDefined();
      expect(prisma.deal.create).toHaveBeenCalled();
    });
  });

  describe('material_ordering', () => {
    it('should create material ordering task', async () => {
      const result = await executeConstructionAction(
        'material_ordering',
        {
          ...mockTask,
          actionConfig: {
            actions: ['material_ordering'],
            materials: ['Lumber', 'Concrete'],
            supplier: 'ABC Supplies',
          },
        } as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(prisma.task.create).toHaveBeenCalled();
      expect(result.data?.materials).toEqual(['Lumber', 'Concrete']);
    });
  });

  describe('progress_update', () => {
    it('should send progress update email', async () => {
      const emailService = new EmailService();
      (EmailService as any).mockImplementation(() => emailService);

      const result = await executeConstructionAction(
        'progress_update',
        {
          ...mockTask,
          actionConfig: {
            actions: ['progress_update'],
            progress: 75,
            message: 'Project is 75% complete',
          },
        } as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.progressPercentage).toBe(75);
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('project_completion', () => {
    it('should complete project and update deal', async () => {
      (prisma.deal.findUnique as any)
        .mockResolvedValueOnce({
          id: 'deal-1',
          title: 'Construction Project',
          leadId: 'lead-1',
        })
        .mockResolvedValueOnce({
          id: 'deal-1',
          title: 'Construction Project',
          leadId: 'lead-1',
          pipeline: {
            stages: [
              { id: 'stage-1', name: 'Prospecting', probability: 10 },
              { id: 'stage-2', name: 'Won', probability: 100 },
            ],
          },
        });

      const result = await executeConstructionAction(
        'project_completion',
        mockTask as WorkflowTask,
        {
          ...mockInstance,
          dealId: 'deal-1',
        } as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(prisma.deal.update).toHaveBeenCalled();
      expect(result.data?.completed).toBe(true);
    });
  });
});
