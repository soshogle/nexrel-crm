/**
 * Unit Tests for Real Estate Workflow Executor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeTask } from '@/lib/real-estate/workflow-task-executor';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import type { REWorkflowTask, REWorkflowInstance } from '@prisma/client';

// Mocks are already set up in tests/setup.ts

describe('Real Estate Executor', () => {
  const mockTask: Partial<REWorkflowTask> = {
    id: 'task-1',
    name: 'CMA Generation',
    description: 'Generate CMA',
    taskType: 'CMA_GENERATION',
    assignedAgentType: 'RE_CMA_GENERATOR',
    actionConfig: {
      actions: ['cma_generation'],
      address: '123 Main St',
      beds: 3,
      baths: 2,
      sqft: 1500,
    },
  };

  const mockInstance: Partial<REWorkflowInstance> = {
    id: 'instance-1',
    userId: 'user-1',
    leadId: 'lead-1',
    dealId: null,
  };

  const mockLead = {
    id: 'lead-1',
    contactPerson: 'John Seller',
    businessName: 'John Seller',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    // ensureREAgentProvisioned uses findUnique (compound key userId_employeeType)
    (prisma.rEAIEmployeeAgent.findUnique as any).mockResolvedValue({
      id: 'agent-1',
      elevenLabsAgentId: 'elevenlabs-agent-1',
    });
    (prisma.rEAIEmployeeAgent.findFirst as any).mockResolvedValue({
      id: 'agent-1',
      elevenLabsAgentId: 'elevenlabs-agent-1',
    });
  });

  describe('voice_call', () => {
    it('should initiate voice call via ElevenLabs', async () => {
      const { elevenLabsService } = await import('@/lib/elevenlabs');
      (prisma.callLog.create as any).mockResolvedValue({ id: 'call-log-1' });
      
      const result = await executeTask(
        {
          ...mockTask,
          assignedAgentType: 'RE_SPEED_TO_LEAD',
          actionConfig: { actions: ['voice_call'] },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(elevenLabsService.initiatePhoneCall).toHaveBeenCalled();
      expect(prisma.callLog.create).toHaveBeenCalled();
    });

    it('should fail if no phone number', async () => {
      (prisma.lead.findUnique as any).mockResolvedValue({
        ...mockLead,
        phone: null,
      });

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: { actions: ['voice_call'] },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No phone number');
    });
  });

  describe('cma_generation', () => {
    it('should generate CMA report', async () => {
      const { generateCMA } = await import('@/lib/real-estate/cma');
      (generateCMA as any).mockResolvedValue({
        id: 'cma-1',
        suggestedPrice: 500000,
        priceRange: { min: 450000, max: 550000 },
        comparables: [],
      });

      (prisma.rEWorkflowInstance.findUnique as any).mockResolvedValue({
        ...mockInstance,
        metadata: {},
      });
      (prisma.rEWorkflowInstance.update as any).mockResolvedValue({});

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: { 
            actions: ['cma_generation'],
            address: '123 Main St',
          },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.actions?.[0]?.data?.cmaReportId).toBeDefined();
      expect(generateCMA).toHaveBeenCalled();
    });

    it('should fail if address missing', async () => {
      (prisma.lead.findUnique as any).mockResolvedValue({
        ...mockLead,
        address: null,
      });

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: { actions: ['cma_generation'] },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Property address is required');
    });
  });

  describe('presentation_generation', () => {
    it('should generate presentation', async () => {
      (prisma.rEListingPresentation.create as any).mockResolvedValue({
        id: 'presentation-1',
      });
      (prisma.rEWorkflowInstance.findUnique as any).mockResolvedValue({
        ...mockInstance,
        metadata: {},
      });
      (prisma.rEWorkflowInstance.update as any).mockResolvedValue({});
      (prisma.user.findUnique as any).mockResolvedValue({
        name: 'Agent Name',
        email: 'agent@example.com',
        phone: '+1234567890',
      });

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: { 
            actions: ['presentation_generation'],
            address: '123 Main St',
            city: 'New York',
          },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.actions?.[0]?.data?.presentationId).toBeDefined();
      expect(prisma.rEListingPresentation.create).toHaveBeenCalled();
    });
  });

  describe('market_research', () => {
    it('should generate market research', async () => {
      (prisma.rEWorkflowInstance.findUnique as any).mockResolvedValue({
        ...mockInstance,
        metadata: {},
      });
      (prisma.rEWorkflowInstance.update as any).mockResolvedValue({});

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: {
            actions: ['market_research'],
            reportType: 'buyer',
            region: 'New York, NY',
          },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('sms', () => {
    it('should send SMS message', async () => {
      (sendSMS as any).mockResolvedValue({
        sid: 'sms-sid-123',
        status: 'sent',
      });

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: {
            actions: ['sms'],
            message: 'Hello from your agent',
          },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(sendSMS).toHaveBeenCalled();
      // The result structure is { data: { actions: [{ data: { phoneNumber } }] } }
      expect(result.data?.actions?.[0]?.data?.phoneNumber).toBe(mockLead.phone);
    });
  });

  describe('email', () => {
    it('should send email', async () => {
      const emailService = new EmailService();
      (EmailService as any).mockImplementation(() => emailService);

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: {
            actions: ['email'],
            subject: 'Test Subject',
            body: 'Test Body',
          },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('calendar', () => {
    it('should create calendar event', async () => {
      (prisma.bookingAppointment.create as any).mockResolvedValue({
        id: 'appointment-1',
        appointmentDate: new Date('2024-12-25T14:00:00Z'),
        duration: 60,
      });
      (prisma.calendarConnection.findFirst as any).mockResolvedValue(null);

      const result = await executeTask(
        {
          ...mockTask,
          actionConfig: {
            actions: ['calendar'],
            title: 'Showing Appointment',
            date: new Date('2024-12-25T14:00:00Z').toISOString(),
            duration: 60,
          },
        } as REWorkflowTask,
        mockInstance as REWorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(prisma.bookingAppointment.create).toHaveBeenCalled();
    });
  });
});
