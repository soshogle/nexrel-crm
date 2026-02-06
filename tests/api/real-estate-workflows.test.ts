/**
 * API Endpoint Tests for Real Estate Workflows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/real-estate/workflows/route';
import { GET as GETTemplate } from '@/app/api/real-estate/workflows/templates/route';
import { POST as POSTExecute } from '@/app/api/real-estate/workflows/[id]/execute/route';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { startWorkflowInstance } from '@/lib/real-estate/workflow-engine';

// Mocks are already set up in tests/setup.ts
vi.mock('next-auth');
vi.mock('@/lib/real-estate/workflow-engine');
vi.mock('next/server');

describe('Real Estate Workflows API', () => {
  const mockSession = {
    user: { id: 'user-1' },
  };

  const mockUser = {
    id: 'user-1',
    industry: 'REAL_ESTATE' as const,
  };

  const mockREWorkflow = {
    id: 're-workflow-1',
    name: 'Buyer Pipeline',
    description: 'Buyer workflow',
    type: 'BUYER' as const,
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

  describe('GET /api/real-estate/workflows', () => {
    it('should return RE workflows for Real Estate user', async () => {
      (prisma.rEWorkflowTemplate.findMany as any).mockResolvedValue([mockREWorkflow]);

      const request = new Request('http://localhost:3000/api/real-estate/workflows');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.templates).toBeDefined();
    });

    it('should return 403 for non-Real Estate user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockUser,
        industry: 'MEDICAL',
      });

      const request = new Request('http://localhost:3000/api/real-estate/workflows');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('only available for real estate');
    });
  });

  describe('POST /api/real-estate/workflows', () => {
    it('should create RE workflow from template', async () => {
      (prisma.rEWorkflowTemplate.create as any).mockResolvedValue({
        ...mockREWorkflow,
        tasks: [],
      });

      const request = new Request('http://localhost:3000/api/real-estate/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New RE Workflow',
          fromTemplate: 'BUYER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.workflow).toBeDefined();
    });
  });

  describe('GET /api/real-estate/workflows/templates', () => {
    it('should return RE templates', async () => {
      const request = new Request('http://localhost:3000/api/real-estate/workflows/templates');
      const response = await GETTemplate(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.templates).toBeDefined();
    });

    it('should return specific template by type', async () => {
      const request = new Request('http://localhost:3000/api/real-estate/workflows/templates?type=BUYER_PIPELINE');
      const response = await GETTemplate(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.template).toBeDefined();
    });
  });

  describe('POST /api/real-estate/workflows/[id]/execute', () => {
    it('should execute RE workflow', async () => {
      (prisma.rEWorkflowTemplate.findFirst as any).mockResolvedValue({
        ...mockREWorkflow,
        tasks: [{ id: 'task-1', displayOrder: 1 }],
      });
      (prisma.lead.findFirst as any).mockResolvedValue({ id: 'lead-1' });
      (prisma.rEWorkflowInstance.findFirst as any).mockResolvedValue(null);
      (startWorkflowInstance as any).mockResolvedValue('instance-1');
      (prisma.rEWorkflowInstance.findUnique as any).mockResolvedValue({
        id: 'instance-1',
        template: mockREWorkflow,
        lead: { id: 'lead-1' },
        executions: [],
      });

      const request = new Request('http://localhost:3000/api/real-estate/workflows/re-workflow-1/execute', {
        method: 'POST',
        body: JSON.stringify({
          leadId: 'lead-1',
        }),
      });

      const response = await POSTExecute(request, { params: { id: 're-workflow-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.instance).toBeDefined();
      expect(startWorkflowInstance).toHaveBeenCalled();
    });
  });
});
