/**
 * Contract tests for API validation schemas.
 * Verifies Zod schemas correctly parse valid/invalid API response shapes.
 * Run: npm run test:unit
 */
import { describe, it, expect } from 'vitest';
import {
  parseHITLApprovals,
  parseHITLNotifications,
  parseWorkflowInstances,
  parseWorkflowExecutions,
  parseIndustryWorkflowInstances,
  HITLPendingResponseSchema,
  LeadCreateBodySchema,
  LeadsGetQuerySchema,
} from '@/lib/api-validation';

describe('api-validation', () => {
  describe('parseHITLApprovals', () => {
    it('parses valid approval shape', () => {
      const data = [
        {
          id: 'exec-1',
          task: { name: 'Review Offer', description: 'Review the offer' },
          instance: {
            lead: { businessName: 'Acme', contactPerson: 'John' },
            deal: { title: '123 Main St' },
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      const result = parseHITLApprovals(data);
      expect(result).toHaveLength(1);
      expect(result[0]?.task?.name).toBe('Review Offer');
      expect(result[0]?.instance?.lead?.businessName).toBe('Acme');
    });

    it('filters invalid items', () => {
      const data = [null, undefined, 'invalid', { id: 'ok' }, {}];
      const result = parseHITLApprovals(data);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((r) => r && typeof r === 'object')).toBe(true);
    });

    it('returns empty array for non-array input', () => {
      expect(parseHITLApprovals(null)).toEqual([]);
      expect(parseHITLApprovals(undefined)).toEqual([]);
      expect(parseHITLApprovals('string')).toEqual([]);
    });
  });

  describe('parseHITLNotifications', () => {
    it('parses valid notification with taskExecution', () => {
      const data = [
        {
          id: 'notif-1',
          taskExecution: {
            task: { name: 'Approve', order: 1 },
            workflowInstance: { workflow: { name: 'Pipeline', workflowType: 'BUYER' } },
          },
          message: 'Needs approval',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      const result = parseHITLNotifications(data);
      expect(result).toHaveLength(1);
      expect(result[0]?.taskExecution?.task?.name).toBe('Approve');
    });

    it('accepts flat notification (no taskExecution)', () => {
      const data = [{ id: 'n1', message: 'Flat', createdAt: '2024-01-01' }];
      const result = parseHITLNotifications(data);
      expect(result).toHaveLength(1);
      expect(result[0]?.message).toBe('Flat');
    });
  });

  describe('parseWorkflowInstances', () => {
    it('parses valid instance with template', () => {
      const data = [
        {
          id: 'inst-1',
          templateId: 'tpl-1',
          template: { name: 'Workflow', tasks: [] },
          status: 'RUNNING',
          executions: [{ id: 'e1', task: { name: 'Task 1' } }],
        },
      ];
      const result = parseWorkflowInstances(data);
      expect(result).toHaveLength(1);
      expect(result[0]?.template?.name).toBe('Workflow');
    });
  });

  describe('parseWorkflowExecutions', () => {
    it('parses valid execution', () => {
      const data = [
        {
          id: 'e1',
          taskId: 't1',
          task: { name: 'Task', displayOrder: 1, isHITL: true },
          status: 'COMPLETED',
        },
      ];
      const result = parseWorkflowExecutions(data);
      expect(result).toHaveLength(1);
      expect(result[0]?.task?.name).toBe('Task');
    });
  });

  describe('parseIndustryWorkflowInstances', () => {
    it('parses industry instance shape', () => {
      const data = [
        {
          id: 'i1',
          workflowName: 'Onboarding',
          status: 'RUNNING',
          executions: [{ taskName: 'Step 1', status: 'COMPLETED' }],
        },
      ];
      const result = parseIndustryWorkflowInstances(data);
      expect(result).toHaveLength(1);
      expect(result[0]?.workflowName).toBe('Onboarding');
    });
  });

  describe('LeadCreateBodySchema', () => {
    it('accepts valid lead with business name', () => {
      const result = LeadCreateBodySchema.safeParse({
        businessName: 'Acme Corp',
        contactPerson: 'John',
        email: 'john@acme.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessName).toBe('Acme Corp');
      }
    });

    it('accepts valid lead with contact person only (transforms businessName)', () => {
      const result = LeadCreateBodySchema.safeParse({
        contactPerson: 'Jane Doe',
        email: 'jane@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessName).toBe('Jane Doe');
      }
    });

    it('rejects when neither business name nor contact person provided', () => {
      const result = LeadCreateBodySchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = LeadCreateBodySchema.safeParse({
        businessName: 'Acme',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LeadsGetQuerySchema', () => {
    it('accepts valid query params', () => {
      const result = LeadsGetQuerySchema.safeParse({ status: 'NEW', search: 'acme' });
      expect(result.success).toBe(true);
    });

    it('accepts empty params', () => {
      const result = LeadsGetQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('HITLPendingResponseSchema', () => {
    it('parses valid HITL pending API response', () => {
      const data = {
        success: true,
        notifications: [],
        pendingApprovals: [{ id: 'e1', task: { name: 'Task' } }],
        totalPending: 1,
      };
      const result = HITLPendingResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.pendingApprovals).toHaveLength(1);
      }
    });
  });
});
