/**
 * Integration Tests for Real Estate Workflow Execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startWorkflowInstance, processTaskExecution, approveHITLGate } from '@/lib/real-estate/workflow-engine';
import { prisma } from '@/lib/db';
import { executeTask } from '@/lib/real-estate/workflow-task-executor';

// Mocks are already set up in tests/setup.ts
vi.mock('@/lib/real-estate/workflow-task-executor');

describe('Real Estate Workflow Execution Integration', () => {
  const mockUserId = 'user-1';
  const mockTemplateId = 're-template-1';
  const mockInstanceId = 're-instance-1';

  const mockRETemplate = {
    id: mockTemplateId,
    tasks: [
      {
        id: 're-task-1',
        name: 'Generate CMA',
        taskType: 'CMA_GENERATION',
        displayOrder: 1,
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        assignedAgentType: 'RE_CMA_GENERATOR',
        actionConfig: { actions: ['cma_generation'], address: '123 Main St' },
      },
      {
        id: 're-task-2',
        name: 'Generate Presentation',
        taskType: 'PRESENTATION_GENERATION',
        displayOrder: 2,
        delayValue: 1,
        delayUnit: 'HOURS',
        isHITL: true,
        assignedAgentType: 'RE_PRESENTATION_GENERATOR',
        actionConfig: { actions: ['presentation_generation'] },
      },
    ],
  };

  const mockREInstance = {
    id: mockInstanceId,
    templateId: mockTemplateId,
    userId: mockUserId,
    status: 'ACTIVE' as const,
    leadId: 'lead-1',
    dealId: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startWorkflowInstance', () => {
    it('should create RE workflow instance', async () => {
      (prisma.rEWorkflowTemplate.findUnique as any).mockResolvedValue(mockRETemplate);
      (prisma.rEWorkflowInstance.create as any).mockResolvedValue(mockREInstance);
      (prisma.rETaskExecution.create as any).mockResolvedValue({
        id: 're-execution-1',
        taskId: 're-task-1',
        status: 'PENDING',
      });
      (executeTask as any).mockResolvedValue({ success: true });

      const instanceId = await startWorkflowInstance(mockUserId, mockTemplateId, {
        leadId: 'lead-1',
        triggerType: 'MANUAL',
      });

      expect(instanceId).toBe(mockInstanceId);
      expect(prisma.rEWorkflowInstance.create).toHaveBeenCalled();
      expect(prisma.rETaskExecution.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('CMA generation', () => {
    it('should generate CMA and store in metadata', async () => {
      (prisma.rETaskExecution.findUnique as any).mockResolvedValue({
        id: 're-execution-1',
        taskId: 're-task-1',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000),
        task: mockRETemplate.tasks[0],
        instance: {
          ...mockREInstance,
          lead: { id: 'lead-1', address: '123 Main St' },
        },
      });
      (prisma.rETaskExecution.update as any).mockResolvedValue({});
      (executeTask as any).mockResolvedValue({
        success: true,
        data: { cmaReportId: 'cma-1', suggestedPrice: 500000 },
      });
      (prisma.rEWorkflowInstance.update as any).mockResolvedValue({});

      await processTaskExecution('re-execution-1');

      expect(executeTask).toHaveBeenCalled();
      expect(prisma.rEWorkflowInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              cmaReportId: 'cma-1',
            }),
          }),
        })
      );
    });
  });

  describe('Presentation generation with HITL', () => {
    it('should pause for HITL approval on presentation', async () => {
      (prisma.rETaskExecution.findUnique as any).mockResolvedValue({
        id: 're-execution-2',
        taskId: 're-task-2',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000),
        task: mockRETemplate.tasks[1],
        instance: {
          ...mockREInstance,
          lead: { id: 'lead-1', contactPerson: 'John Seller' },
        },
      });
      (prisma.rETaskExecution.update as any).mockResolvedValue({});
      (prisma.rEHITLNotification.create as any).mockResolvedValue({ id: 'hitl-1' });
      (prisma.user.findUnique as any).mockResolvedValue({
        email: 'user@example.com',
        phone: '+1234567890',
      });

      await processTaskExecution('re-execution-2');

      expect(prisma.rETaskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 're-execution-2' },
          data: expect.objectContaining({ status: 'AWAITING_HITL' }),
        })
      );
      expect(prisma.rEHITLNotification.create).toHaveBeenCalled();
      expect(executeTask).not.toHaveBeenCalled(); // Should wait for approval
    });

    it('should execute presentation after HITL approval', async () => {
      (prisma.rETaskExecution.findUnique as any).mockResolvedValue({
        id: 're-execution-2',
        status: 'AWAITING_HITL',
        task: mockRETemplate.tasks[1],
        instance: mockREInstance,
      });
      (prisma.rETaskExecution.update as any).mockResolvedValue({});
      (prisma.rEHITLNotification.updateMany as any).mockResolvedValue({});
      (executeTask as any).mockResolvedValue({
        success: true,
        data: { presentationId: 'presentation-1' },
      });
      (prisma.rEWorkflowInstance.findUnique as any).mockResolvedValue({
        ...mockREInstance,
        template: mockRETemplate,
        executions: [
          { id: 're-execution-1', taskId: 're-task-1', status: 'COMPLETED' },
        ],
      });

      await approveHITLGate('re-execution-2', mockUserId, 'Approved');

      expect(executeTask).toHaveBeenCalled();
      expect(prisma.rETaskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 're-execution-2' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );
    });
  });

  describe('Market research generation', () => {
    it('should generate market research report', async () => {
      const marketResearchTask = {
        ...mockRETemplate.tasks[0],
        taskType: 'MARKET_RESEARCH',
        actionConfig: {
          actions: ['market_research'],
          reportType: 'buyer',
          region: 'New York',
        },
      };

      (prisma.rETaskExecution.findUnique as any).mockResolvedValue({
        id: 're-execution-3',
        taskId: 're-task-3',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000),
        task: marketResearchTask,
        instance: {
          ...mockREInstance,
          lead: { id: 'lead-1' },
        },
      });
      (prisma.rETaskExecution.update as any).mockResolvedValue({});
      (executeTask as any).mockResolvedValue({
        success: true,
        data: { researchReportId: 'research-1', reportType: 'buyer' },
      });

      await processTaskExecution('re-execution-3');

      expect(executeTask).toHaveBeenCalled();
      expect(executeTask).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'MARKET_RESEARCH',
        }),
        expect.any(Object)
      );
    });
  });
});
