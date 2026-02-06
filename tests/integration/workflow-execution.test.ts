/**
 * Integration Tests for Workflow Execution
 * Tests the full workflow execution flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startWorkflowInstance, processTaskExecution, approveHITLGate } from '@/lib/workflows/workflow-engine';
import { prisma } from '@/lib/db';
import { executeTask } from '@/lib/workflows/workflow-task-executor';

// Mocks are already set up in tests/setup.ts
vi.mock('@/lib/workflows/workflow-task-executor');

describe('Workflow Execution Integration', () => {
  const mockUserId = 'user-1';
  const mockTemplateId = 'template-1';
  const mockInstanceId = 'instance-1';

  const mockTemplate = {
    id: mockTemplateId,
    industry: 'MEDICAL' as const,
    tasks: [
      {
        id: 'task-1',
        name: 'Research Patient',
        taskType: 'PATIENT_RESEARCH',
        displayOrder: 1,
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        parentTaskId: null,
        branchCondition: null,
        actionConfig: { actions: ['patient_research'] },
      },
      {
        id: 'task-2',
        name: 'Book Appointment',
        taskType: 'APPOINTMENT_BOOKING',
        displayOrder: 2,
        delayValue: 1,
        delayUnit: 'HOURS',
        isHITL: false,
        parentTaskId: null,
        branchCondition: null,
        actionConfig: { actions: ['appointment_booking'] },
      },
    ],
  };

  const mockInstance = {
    id: mockInstanceId,
    templateId: mockTemplateId,
    userId: mockUserId,
    industry: 'MEDICAL' as const,
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
    it('should create instance and schedule first task', async () => {
      (prisma.workflowTemplate.findUnique as any).mockResolvedValue(mockTemplate);
      (prisma.workflowInstance.create as any).mockResolvedValue(mockInstance);
      (prisma.taskExecution.create as any).mockResolvedValue({
        id: 'execution-1',
        taskId: 'task-1',
        status: 'PENDING',
      });
      (executeTask as any).mockResolvedValue({ success: true });

      const instanceId = await startWorkflowInstance(mockUserId, mockTemplateId, {
        leadId: 'lead-1',
        triggerType: 'MANUAL',
      });

      expect(instanceId).toBe(mockInstanceId);
      expect(prisma.workflowInstance.create).toHaveBeenCalled();
      expect(prisma.taskExecution.create).toHaveBeenCalledTimes(2); // Both tasks
      expect(executeTask).toHaveBeenCalled(); // First task executed
    });

    it('should handle task delays correctly', async () => {
      (prisma.workflowTemplate.findUnique as any).mockResolvedValue(mockTemplate);
      (prisma.workflowInstance.create as any).mockResolvedValue(mockInstance);
      (prisma.taskExecution.create as any).mockImplementation((args: any) => ({
        id: `execution-${args.data.taskId}`,
        ...args.data,
      }));

      await startWorkflowInstance(mockUserId, mockTemplateId, {
        leadId: 'lead-1',
        triggerType: 'MANUAL',
      });

      const createCalls = (prisma.taskExecution.create as any).mock.calls;
      const firstTask = createCalls.find((call: any) => call[0].data.taskId === 'task-1');
      const secondTask = createCalls.find((call: any) => call[0].data.taskId === 'task-2');

      expect(firstTask[0].data.scheduledFor).toBeInstanceOf(Date);
      expect(secondTask[0].data.scheduledFor).toBeInstanceOf(Date);
      // Second task should be scheduled for future
      expect(secondTask[0].data.scheduledFor.getTime()).toBeGreaterThan(firstTask[0].data.scheduledFor.getTime());
    });
  });

  describe('processTaskExecution', () => {
    it('should execute task and move to next', async () => {
      (prisma.taskExecution.findUnique as any).mockResolvedValue({
        id: 'execution-1',
        taskId: 'task-1',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000), // Past
        task: mockTemplate.tasks[0],
        instance: {
          ...mockInstance,
          lead: { id: 'lead-1' },
          deal: null,
        },
      });
      (prisma.taskExecution.update as any).mockResolvedValue({});
      (executeTask as any).mockResolvedValue({ success: true });
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        ...mockInstance,
        template: mockTemplate,
        executions: [
          { id: 'execution-1', taskId: 'task-1', status: 'COMPLETED' },
        ],
      });
      (prisma.taskExecution.findFirst as any).mockResolvedValue(null);
      (prisma.taskExecution.create as any).mockResolvedValue({
        id: 'execution-2',
        taskId: 'task-2',
      });

      await processTaskExecution('execution-1');

      expect(prisma.taskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'execution-1' },
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        })
      );
      expect(executeTask).toHaveBeenCalled();
      expect(prisma.taskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'execution-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );
    });

    it('should handle HITL gates', async () => {
      const hitlTask = {
        ...mockTemplate.tasks[0],
        isHITL: true,
      };

      (prisma.taskExecution.findUnique as any).mockResolvedValue({
        id: 'execution-1',
        taskId: 'task-1',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000),
        task: hitlTask,
        instance: {
          ...mockInstance,
          lead: { id: 'lead-1', contactPerson: 'John Doe' },
        },
      });
      (prisma.taskExecution.update as any).mockResolvedValue({});
      (prisma.hITLNotification.create as any).mockResolvedValue({ id: 'notification-1' });
      (prisma.user.findUnique as any).mockResolvedValue({
        email: 'user@example.com',
        phone: '+1234567890',
      });

      await processTaskExecution('execution-1');

      expect(prisma.taskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'execution-1' },
          data: expect.objectContaining({ status: 'AWAITING_HITL' }),
        })
      );
      expect(prisma.hITLNotification.create).toHaveBeenCalled();
      expect(executeTask).not.toHaveBeenCalled(); // Should not execute until approved
    });

    it('should handle branching conditions', async () => {
      const branchTask = {
        ...mockTemplate.tasks[1],
        parentTaskId: 'task-1',
        branchCondition: {
          field: 'status',
          operator: 'equals',
          value: 'approved',
        },
      };

      (prisma.taskExecution.findUnique as any).mockResolvedValue({
        id: 'execution-2',
        taskId: 'task-2',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000),
        task: branchTask,
        instance: mockInstance,
      });
      (prisma.taskExecution.findFirst as any).mockResolvedValue({
        id: 'execution-1',
        taskId: 'task-1',
        status: 'COMPLETED',
        result: { status: 'approved' },
      });
      (prisma.taskExecution.update as any).mockResolvedValue({});
      (executeTask as any).mockResolvedValue({ success: true });

      await processTaskExecution('execution-2');

      // Should execute because condition is met
      expect(executeTask).toHaveBeenCalled();
    });

    it('should skip task if branch condition not met', async () => {
      const branchTask = {
        ...mockTemplate.tasks[1],
        parentTaskId: 'task-1',
        branchCondition: {
          field: 'status',
          operator: 'equals',
          value: 'approved',
        },
      };

      (prisma.taskExecution.findUnique as any).mockResolvedValue({
        id: 'execution-2',
        taskId: 'task-2',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000),
        task: branchTask,
        instance: mockInstance,
      });
      (prisma.taskExecution.findFirst as any).mockResolvedValue({
        id: 'execution-1',
        taskId: 'task-1',
        status: 'COMPLETED',
        result: { status: 'rejected' }, // Condition not met
      });
      (prisma.taskExecution.update as any).mockResolvedValue({});
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        ...mockInstance,
        template: mockTemplate,
        executions: [
          { id: 'execution-1', taskId: 'task-1', status: 'COMPLETED' },
        ],
      });

      await processTaskExecution('execution-2');

      // Should skip task
      expect(prisma.taskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'execution-2' },
          data: expect.objectContaining({ status: 'SKIPPED' }),
        })
      );
      expect(executeTask).not.toHaveBeenCalled();
    });
  });

  describe('approveHITLGate', () => {
    it('should approve HITL and continue execution', async () => {
      (prisma.taskExecution.findUnique as any).mockResolvedValue({
        id: 'execution-1',
        status: 'AWAITING_HITL',
        task: mockTemplate.tasks[0],
        instance: mockInstance,
      });
      (prisma.taskExecution.update as any).mockResolvedValue({});
      (prisma.hITLNotification.updateMany as any).mockResolvedValue({});
      (executeTask as any).mockResolvedValue({ success: true });
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        ...mockInstance,
        template: mockTemplate,
        executions: [
          { id: 'execution-1', taskId: 'task-1', status: 'COMPLETED' },
        ],
      });

      await approveHITLGate('execution-1', mockUserId, 'Approved');

      expect(prisma.taskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'execution-1' },
          data: expect.objectContaining({
            status: 'APPROVED',
            hitlApprovedBy: mockUserId,
          }),
        })
      );
      expect(executeTask).toHaveBeenCalled();
      expect(prisma.taskExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'execution-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );
    });
  });

  describe('workflow completion', () => {
    it('should mark workflow as completed when all tasks done', async () => {
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        ...mockInstance,
        template: mockTemplate,
        executions: [
          { id: 'execution-1', taskId: 'task-1', status: 'COMPLETED' },
          { id: 'execution-2', taskId: 'task-2', status: 'COMPLETED' },
        ],
      });
      (prisma.workflowInstance.update as any).mockResolvedValue({});

      // Simulate processNextTask being called after last task
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: mockInstanceId },
        include: {
          template: { include: { tasks: true } },
          executions: true,
        },
      });

      if (instance) {
        const completedTaskIds = new Set(
          instance.executions
            .filter((e: any) => e.status === 'COMPLETED')
            .map((e: any) => e.taskId)
        );

        const nextTask = instance.template.tasks.find(
          (task: any) => !completedTaskIds.has(task.id)
        );

        if (!nextTask) {
          await prisma.workflowInstance.update({
            where: { id: mockInstanceId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        }
      }

      expect(prisma.workflowInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockInstanceId },
          data: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });
  });
});
