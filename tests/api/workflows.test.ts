/**
 * API Endpoint Tests for Generic Workflows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/workflows/route';
import { GET as GETTemplate } from '@/app/api/workflows/templates/route';
import { POST as POSTExecute } from '@/app/api/workflows/[id]/execute/route';
import { POST as POSTApprove } from '@/app/api/workflows/hitl/[id]/approve/route';
import { POST as POSTReject } from '@/app/api/workflows/hitl/[id]/reject/route';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { startWorkflowInstance } from '@/lib/workflows/workflow-engine';

// Mocks are already set up in tests/setup.ts
vi.mock('next-auth');
vi.mock('@/lib/workflows/workflow-engine');
vi.mock('next/server');

describe('Workflows API', () => {
  const mockSession = {
    user: { id: 'user-1' },
  };

  const mockUser = {
    id: 'user-1',
    industry: 'MEDICAL' as const,
  };

  const mockWorkflow = {
    id: 'workflow-1',
    name: 'Test Workflow',
    description: 'Test Description',
    type: 'CUSTOM',
    industry: 'MEDICAL' as const,
    userId: 'user-1',
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
  });

  describe('GET /api/workflows', () => {
    it('should return workflows for user industry', async () => {
      (prisma.workflowTemplate.findMany as any).mockResolvedValue([mockWorkflow]);

      const request = new Request('http://localhost:3000/api/workflows');
      const response = await GET(request);
      
      if (!response) {
        throw new Error('GET returned undefined - route handler may have thrown an error');
      }
      
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.workflows).toBeDefined();
    });

    it('should return 403 for Real Estate industry', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockUser,
        industry: 'REAL_ESTATE',
      });

      const request = new Request('http://localhost:3000/api/workflows');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('not available');
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/workflows');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/workflows', () => {
    it('should create new workflow', async () => {
      (prisma.workflowTemplate.create as any).mockResolvedValue({
        ...mockWorkflow,
        tasks: [],
      });

      const requestBody = {
        name: 'New Workflow',
        type: 'CUSTOM',
        description: 'New Description',
      };
      const request = new Request('http://localhost:3000/api/workflows', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.workflow).toBeDefined();
      expect(prisma.workflowTemplate.create).toHaveBeenCalled();
    });

    it('should create workflow from template', async () => {
      (prisma.workflowTemplate.create as any).mockResolvedValue(mockWorkflow);

      const requestBody = {
        name: 'From Template',
        fromTemplate: 'patient-onboarding',
      };
      const request = new Request('http://localhost:3000/api/workflows', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/workflows/templates', () => {
    it('should return industry templates', async () => {
      const request = new Request('http://localhost:3000/api/workflows/templates');
      const response = await GETTemplate(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.templates).toBeDefined();
    });

    it('should return specific template by ID', async () => {
      const request = new Request('http://localhost:3000/api/workflows/templates?id=patient-onboarding');
      const response = await GETTemplate(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.template).toBeDefined();
    });
  });

  describe('POST /api/workflows/[id]/execute', () => {
    it('should execute workflow instance', async () => {
      (prisma.workflowTemplate.findFirst as any).mockResolvedValue({
        ...mockWorkflow,
        tasks: [{ id: 'task-1', displayOrder: 1 }],
      });
      (prisma.lead.findFirst as any).mockResolvedValue({ id: 'lead-1' });
      (prisma.workflowInstance.findFirst as any).mockResolvedValue(null);
      (startWorkflowInstance as any).mockResolvedValue('instance-1');
      (prisma.workflowInstance.findUnique as any).mockResolvedValue({
        id: 'instance-1',
        template: mockWorkflow,
        lead: { id: 'lead-1' },
        executions: [],
      });

      const requestBody = { leadId: 'lead-1' };
      const request = new Request('http://localhost:3000/api/workflows/workflow-1/execute', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POSTExecute(request, { params: { id: 'workflow-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.instance).toBeDefined();
      expect(startWorkflowInstance).toHaveBeenCalled();
    });

    it('should fail if workflow not found', async () => {
      (prisma.workflowTemplate.findFirst as any).mockResolvedValue(null);

      const requestBody = { leadId: 'lead-1' };
      const request = new Request('http://localhost:3000/api/workflows/invalid/execute', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      request.json = vi.fn().mockResolvedValue(requestBody);

      const response = await POSTExecute(request, { params: { id: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('POST /api/workflows/hitl/[id]/approve', () => {
    it('should approve HITL gate', async () => {
      (prisma.taskExecution.findFirst as any).mockResolvedValue({
        id: 'execution-1',
        status: 'AWAITING_HITL',
        task: { id: 'task-1', name: 'Task 1', displayOrder: 0 },
        instance: {
          id: 'instance-1',
          userId: 'user-1',
          template: {
            id: 'template-1',
            tasks: [
              { id: 'task-1', name: 'Task 1', displayOrder: 0 },
              { id: 'task-2', name: 'Task 2', displayOrder: 1 },
            ],
          },
        },
      });
      (prisma.taskExecution.findUnique as any).mockResolvedValue({
        id: 'execution-1',
        taskId: 'task-1',
        task: { id: 'task-1', name: 'Task 1', displayOrder: 0 },
        instance: {
          id: 'instance-1',
          userId: 'user-1',
          template: {
            id: 'template-1',
            tasks: [
              { id: 'task-1', name: 'Task 1', displayOrder: 0 },
              { id: 'task-2', name: 'Task 2', displayOrder: 1 },
            ],
          },
        },
      });

      const { approveHITLGate } = await import('@/lib/workflows/workflow-engine');
      (approveHITLGate as any).mockResolvedValue(undefined);

      const requestBody = { notes: 'Approved' };
      const request = new Request('http://localhost:3000/api/workflows/hitl/execution-1/approve', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      // Mock request.json() method
      request.json = vi.fn().mockResolvedValue(requestBody);

      let response;
      try {
        response = await POSTApprove(request, { params: { id: 'execution-1' } });
      } catch (error) {
        console.error('POSTApprove error:', error);
        throw error;
      }
      if (!response) {
        throw new Error('POSTApprove returned undefined');
      }
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/workflows/hitl/[id]/reject', () => {
    it('should reject HITL gate', async () => {
      (prisma.taskExecution.findFirst as any).mockResolvedValue({
        id: 'execution-1',
        status: 'AWAITING_HITL',
        instanceId: 'instance-1',
        task: { id: 'task-1' },
        instance: {
          id: 'instance-1',
          userId: 'user-1',
        },
      });
      (prisma.workflowInstance.update as any).mockResolvedValue({});
      (prisma.taskExecution.findUnique as any).mockResolvedValue({
        id: 'execution-1',
        status: 'REJECTED',
        taskId: 'task-1',
        task: { id: 'task-1' },
        instance: {
          id: 'instance-1',
          userId: 'user-1',
        },
      });

      const { rejectHITLGate } = await import('@/lib/workflows/workflow-engine');
      (rejectHITLGate as any).mockResolvedValue(undefined);

      const requestBody = { notes: 'Rejected', pauseWorkflow: false };
      const request = new Request('http://localhost:3000/api/workflows/hitl/execution-1/reject', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      // Mock request.json() method
      request.json = vi.fn().mockResolvedValue(requestBody);

      let response;
      try {
        response = await POSTReject(request, { params: { id: 'execution-1' } });
      } catch (error) {
        console.error('POSTReject error:', error);
        throw error;
      }
      if (!response) {
        throw new Error('POSTReject returned undefined');
      }
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
