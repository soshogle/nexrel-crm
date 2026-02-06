/**
 * Unit Tests for Restaurant Industry Executor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeRestaurantAction } from '@/lib/workflows/industry-executors/restaurant-executor';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import type { WorkflowTask, WorkflowInstance } from '@prisma/client';

// Mocks are already set up in tests/setup.ts

describe('Restaurant Executor', () => {
  const mockTask: Partial<WorkflowTask> = {
    id: 'task-1',
    name: 'Reservation Task',
    description: 'Confirm reservation',
    taskType: 'RESERVATION_CONFIRMATION',
    actionConfig: {
      actions: ['reservation_confirmation'],
      date: new Date('2024-12-25T19:00:00Z').toISOString(),
      partySize: 4,
    },
  };

  const mockInstance: Partial<WorkflowInstance> = {
    id: 'instance-1',
    userId: 'user-1',
    industry: 'RESTAURANT',
    leadId: 'lead-1',
  };

  const mockLead = {
    id: 'lead-1',
    contactPerson: 'Jane Smith',
    businessName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567890',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.bookingAppointment.create as any).mockResolvedValue({
      id: 'reservation-1',
      appointmentDate: new Date('2024-12-25T19:00:00Z'),
    });
    (prisma.lead.update as any).mockResolvedValue(mockLead);
  });

  describe('reservation_confirmation', () => {
    it('should successfully confirm reservation', async () => {
      const result = await executeRestaurantAction(
        'reservation_confirmation',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.reservationId).toBeDefined();
      expect(result.data?.partySize).toBe(4);
      expect(sendSMS).toHaveBeenCalled();
    });
  });

  describe('reservation_reminder', () => {
    it('should send reservation reminder', async () => {
      (prisma.bookingAppointment.findFirst as any).mockResolvedValue({
        id: 'reservation-1',
        appointmentDate: new Date('2024-12-25T19:00:00Z'),
      });

      const result = await executeRestaurantAction(
        'reservation_reminder',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(sendSMS).toHaveBeenCalled();
    });
  });

  describe('loyalty_points_update', () => {
    it('should update loyalty points', async () => {
      (prisma.lead.findUnique as any).mockResolvedValue({
        ...mockLead,
        customFields: { loyaltyPoints: 100 },
      });

      const result = await executeRestaurantAction(
        'loyalty_points_update',
        {
          ...mockTask,
          actionConfig: { actions: ['loyalty_points_update'], points: 50 },
        } as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.pointsAdded).toBe(50);
      expect(prisma.lead.update).toHaveBeenCalled();
    });
  });

  describe('special_offer_notification', () => {
    it('should send special offer', async () => {
      const emailService = new EmailService();
      (EmailService as any).mockImplementation(() => emailService);

      const result = await executeRestaurantAction(
        'special_offer_notification',
        {
          ...mockTask,
          actionConfig: {
            actions: ['special_offer_notification'],
            title: 'Special Deal',
            discountCode: 'SAVE20',
          },
        } as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.discountCode).toBe('SAVE20');
    });
  });

  describe('birthday_greeting', () => {
    it('should send birthday greeting', async () => {
      const emailService = new EmailService();
      (EmailService as any).mockImplementation(() => emailService);

      const result = await executeRestaurantAction(
        'birthday_greeting',
        mockTask as WorkflowTask,
        mockInstance as WorkflowInstance
      );

      expect(result.success).toBe(true);
      expect(result.data?.birthdayGreetingSent).toBe(true);
      expect(sendSMS).toHaveBeenCalled();
    });
  });
});
