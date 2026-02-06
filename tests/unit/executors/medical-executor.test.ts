/**
 * Unit Tests for Medical Industry Executor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMedicalAction } from '@/lib/workflows/industry-executors/medical-executor';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import { CalendarService } from '@/lib/calendar/calendar-service';
import type { WorkflowTask, WorkflowInstance } from '@prisma/client';

// Mocks are already set up in tests/setup.ts
// Just ensure prisma is available

describe('Medical Executor', () => {
  const mockTask: Partial<WorkflowTask> = {
    id: 'task-1',
    name: 'Test Task',
    description: 'Test Description',
    taskType: 'APPOINTMENT_BOOKING',
    actionConfig: {
      actions: ['appointment_booking'],
      date: new Date('2024-12-25T10:00:00Z').toISOString(),
      duration: 30,
    },
  };

  const mockInstance: Partial<WorkflowInstance> = {
    id: 'instance-1',
    userId: 'user-1',
    industry: 'MEDICAL',
    leadId: 'lead-1',
    dealId: null,
  };

  const mockLead = {
    id: 'lead-1',
    contactPerson: 'John Doe',
    businessName: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.bookingAppointment.create as any).mockResolvedValue({
      id: 'appointment-1',
      appointmentDate: new Date('2024-12-25T10:00:00Z'),
      duration: 30,
    });
    (prisma.task.create as any).mockResolvedValue({ id: 'task-created-1' });
  });

  describe('appointment_booking', () => {
    it('should successfully book an appointment', async () => {
      const result = await executeMedicalAction(
        'appointment_booking',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.appointmentId).toBeDefined();
      expect(prisma.bookingAppointment.create).toHaveBeenCalled();
    });

    it('should fail if no lead found', async () => {
      (prisma.lead.findUnique as any).mockResolvedValue(null);

      const result = await executeMedicalAction(
        'appointment_booking',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No lead/patient found');
    });

    it('should sync to calendar when available', async () => {
      const calendarService = new CalendarService('user-1');
      (CalendarService as any).mockImplementation(() => calendarService);

      await executeMedicalAction(
        'appointment_booking',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(calendarService.createEvent).toHaveBeenCalled();
    });
  });

  describe('appointment_reminder', () => {
    it('should send appointment reminder via SMS and Email', async () => {
      (prisma.bookingAppointment.findFirst as any).mockResolvedValue({
        id: 'appointment-1',
        appointmentDate: new Date('2024-12-25T10:00:00Z'),
      });

      const result = await executeMedicalAction(
        'appointment_reminder',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(sendSMS).toHaveBeenCalled();
    });

    it('should fail if no appointment found', async () => {
      (prisma.bookingAppointment.findFirst as any).mockResolvedValue(null);

      const result = await executeMedicalAction(
        'appointment_reminder',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No appointment found');
    });
  });

  describe('patient_research', () => {
    it('should research patient information', async () => {
      (prisma.bookingAppointment.findMany as any).mockResolvedValue([]);

      const result = await executeMedicalAction(
        'patient_research',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.leadId).toBe('lead-1');
    });
  });

  describe('insurance_verification', () => {
    it('should create insurance verification task', async () => {
      const result = await executeMedicalAction(
        'insurance_verification',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(prisma.task.create).toHaveBeenCalled();
      expect(result.data?.verificationTaskCreated).toBe(true);
    });
  });

  describe('prescription_reminder', () => {
    it('should send prescription reminder', async () => {
      const result = await executeMedicalAction(
        'prescription_reminder',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(sendSMS).toHaveBeenCalled();
    });
  });

  describe('test_results_notification', () => {
    it('should notify patient of test results', async () => {
      const emailService = new EmailService();
      (EmailService as any).mockImplementation(() => emailService);

      const result = await executeMedicalAction(
        'test_results_notification',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('referral_coordination', () => {
    it('should create referral coordination task', async () => {
      const result = await executeMedicalAction(
        'referral_coordination',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(prisma.task.create).toHaveBeenCalled();
    });
  });

  describe('patient_onboarding', () => {
    it('should create onboarding tasks and send welcome email', async () => {
      const emailService = new EmailService();
      (EmailService as any).mockImplementation(() => emailService);

      const result = await executeMedicalAction(
        'patient_onboarding',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(prisma.task.create).toHaveBeenCalledTimes(4); // 4 onboarding tasks
      expect(result.data?.onboardingTasksCreated).toBe(4);
    });
  });

  describe('post_visit_followup', () => {
    it('should send follow-up and create feedback task', async () => {
      const emailService = new EmailService();
      (EmailService as any).mockImplementation(() => emailService);

      const result = await executeMedicalAction(
        'post_visit_followup',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(prisma.task.create).toHaveBeenCalled();
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await executeMedicalAction(
        'unknown_action',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown Medical action');
    });
  });
});
