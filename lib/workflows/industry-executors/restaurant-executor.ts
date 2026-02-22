/**
 * Restaurant Industry Workflow Task Executor
 * Handles Restaurant-specific workflow actions
 */

import { WorkflowTask, WorkflowInstance } from '@prisma/client';
import { createDalContext } from '@/lib/context/industry-context';
import { leadService, taskService, getCrmDb } from '@/lib/dal';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import { CalendarService } from '@/lib/calendar/calendar-service';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute Restaurant-specific action
 */
export async function executeRestaurantAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  switch (action) {
    case 'reservation_confirmation':
      return await confirmReservation(task, instance);
    case 'reservation_reminder':
      return await sendReservationReminder(task, instance);
    case 'customer_research':
      return await researchCustomer(task, instance);
    case 'order_tracking':
      return await trackOrder(task, instance);
    case 'menu_recommendation':
      return await recommendMenu(task, instance);
    case 'loyalty_points_update':
      return await updateLoyaltyPoints(task, instance);
    case 'feedback_request':
      return await requestFeedback(task, instance);
    case 'special_offer_notification':
      return await sendSpecialOffer(task, instance);
    case 'birthday_greeting':
      return await sendBirthdayGreeting(task, instance);
    default:
      return { success: false, error: `Unknown Restaurant action: ${action}` };
  }
}

/**
 * Confirm reservation
 */
async function confirmReservation(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  const actionConfig = task.actionConfig as any;
  const reservationDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const partySize = actionConfig?.partySize || 2;
  const specialRequests = actionConfig?.specialRequests || '';

  try {
    // Create reservation/appointment
    const reservation = await getCrmDb(ctx).bookingAppointment.create({
      data: {
        userId: instance.userId,
        leadId: instance.leadId || undefined,
        customerName: lead.contactPerson || lead.businessName || 'Guest',
        customerEmail: lead.email || undefined,
        customerPhone: lead.phone || '',
        appointmentDate: reservationDate,
        duration: 120, // 2 hours default
        status: 'CONFIRMED',
        meetingType: 'IN_PERSON',
        notes: `Reservation for ${partySize} guests. ${specialRequests}`,
      },
    });

    // Calendar sync is handled via bookingAppointment above

    // Send confirmation
    const confirmationMessage = `Your reservation is confirmed for ${reservationDate.toLocaleDateString()} at ${reservationDate.toLocaleTimeString()} for ${partySize} guests. We look forward to seeing you!`;

    if (lead.phone) {
      await sendSMS(lead.phone, confirmationMessage);
    }

    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Reservation Confirmed',
        html: `<p>${confirmationMessage}</p>`,
        text: confirmationMessage,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        reservationId: reservation.id,
        reservationDate: reservationDate.toISOString(),
        partySize,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Restaurant] Failed to confirm reservation:', error);
    return {
      success: false,
      error: `Failed to confirm reservation: ${error.message}`,
    };
  }
}

/**
 * Send reservation reminder
 */
async function sendReservationReminder(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  const actionConfig = task.actionConfig as any;
  const reservationId = actionConfig?.reservationId;

  const reservation = reservationId
    ? await getCrmDb(ctx).bookingAppointment.findUnique({ where: { id: reservationId } })
    : await getCrmDb(ctx).bookingAppointment.findFirst({
        where: { leadId: instance.leadId || undefined, userId: instance.userId },
        orderBy: { appointmentDate: 'desc' },
      });

  if (!reservation) {
    return { success: false, error: 'No reservation found' };
  }

  const reminderMessage = actionConfig?.message || 
    `Reminder: You have a reservation on ${reservation.appointmentDate.toLocaleDateString()} at ${reservation.appointmentDate.toLocaleTimeString()}. We look forward to seeing you!`;

  try {
    const results: TaskResult[] = [];

    if (lead?.phone) {
      try {
        await sendSMS(lead.phone, reminderMessage);
        results.push({ success: true, data: { channel: 'SMS' } });
      } catch (error: any) {
        results.push({ success: false, error: `SMS failed: ${error.message}` });
      }
    }

    if (lead?.email) {
      try {
        const emailService = new EmailService();
        await emailService.sendEmail({
          to: lead.email,
          subject: 'Reservation Reminder',
          html: `<p>${reminderMessage}</p>`,
          text: reminderMessage,
          userId: instance.userId,
        });
        results.push({ success: true, data: { channel: 'Email' } });
      } catch (error: any) {
        results.push({ success: false, error: `Email failed: ${error.message}` });
      }
    }

    return {
      success: results.every(r => r.success),
      data: {
        reservationId: reservation.id,
        channels: results,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to send reminder: ${error.message}`,
    };
  }
}

/**
 * Research customer preferences
 */
async function researchCustomer(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  try {
    // Get customer's reservation history
    const reservations = await getCrmDb(ctx).bookingAppointment.findMany({
      where: {
        leadId: instance.leadId || undefined,
        userId: instance.userId,
      },
      orderBy: { appointmentDate: 'desc' },
      take: 10,
    });

    // Enrich customer data
    const { DataEnrichmentService } = await import('@/lib/data-enrichment-service');
    const enrichmentService = new DataEnrichmentService();
    
    let domain: string | undefined;
    if (lead.website) {
      try {
        domain = new URL(lead.website).hostname;
      } catch (e) {}
    }
    
    const enrichmentResult = await enrichmentService.enrichLead(lead.id, {
      email: lead.email || undefined,
      domain,
      firstName: lead.contactPerson?.split(' ')[0],
      lastName: lead.contactPerson?.split(' ').slice(1).join(' '),
    });

    return {
      success: true,
      data: {
        customerId: lead.id,
        reservationHistory: reservations.length,
        preferences: enrichmentResult.data,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to research customer: ${error.message}`,
    };
  }
}

/**
 * Track order status
 */
async function trackOrder(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  const actionConfig = task.actionConfig as any;
  const orderId = actionConfig?.orderId || `ORDER-${Date.now()}`;
  const orderStatus = actionConfig?.status || 'PREPARING';

  // In a real implementation, this would integrate with POS system
  // For now, create a task to track the order
  try {
    await taskService.create(ctx, {
      title: `Track Order: ${orderId}`,
      description: `Customer: ${lead.contactPerson || lead.businessName}\nStatus: ${orderStatus}`,
      status: 'TODO',
      priority: 'MEDIUM',
      leadId: instance.leadId || undefined,
    });

    // Notify customer
    const statusMessage = `Your order ${orderId} is currently ${orderStatus.toLowerCase()}. We'll notify you when it's ready!`;

    if (lead.phone) {
      await sendSMS(lead.phone, statusMessage);
    }

    return {
      success: true,
      data: {
        orderId,
        status: orderStatus,
        notificationSent: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to track order: ${error.message}`,
    };
  }
}

/**
 * Recommend menu items
 */
async function recommendMenu(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  const actionConfig = task.actionConfig as any;
  const recommendations = actionConfig?.items || ['Chef\'s Special', 'Popular Dish', 'Seasonal Menu Item'];

  try {
    const emailService = new EmailService();
    
    if (lead.email) {
      const menuHtml = recommendations.map((item: string, index: number) => 
        `<li>${index + 1}. ${item}</li>`
      ).join('');

      await emailService.sendEmail({
        to: lead.email,
        subject: 'Menu Recommendations for You',
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || 'Valued Customer'},</p>
          <p>Based on your preferences, we recommend:</p>
          <ul>${menuHtml}</ul>
          <p>We hope to see you soon!</p>
        </div>`,
        text: `Menu Recommendations: ${recommendations.join(', ')}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        recommendations,
        emailSent: !!lead.email,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to recommend menu: ${error.message}`,
    };
  }
}

/**
 * Update loyalty points
 */
async function updateLoyaltyPoints(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  const actionConfig = task.actionConfig as any;
  const points = actionConfig?.points || 100;
  const reason = actionConfig?.reason || 'Visit';

  // In a real implementation, this would update a loyalty program database
  // For now, store in enrichedData (Lead model uses enrichedData, not customFields)
  try {
    const leadEnrichedData = (lead as any).enrichedData as any;
    const currentPoints = leadEnrichedData?.loyaltyPoints || 0;
    const newPoints = currentPoints + points;

    await leadService.update(ctx, lead.id, {
      enrichedData: {
        ...(leadEnrichedData || {}),
        loyaltyPoints: newPoints,
        lastPointsUpdate: new Date().toISOString(),
      } as any,
    });

    // Notify customer
    const message = `You've earned ${points} loyalty points! Your total is now ${newPoints} points. Thank you for your ${reason}!`;

    if (lead.phone) {
      await sendSMS(lead.phone, message);
    }

    return {
      success: true,
      data: {
        pointsAdded: points,
        totalPoints: newPoints,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to update loyalty points: ${error.message}`,
    };
  }
}

/**
 * Request customer feedback
 */
async function requestFeedback(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  try {
    const emailService = new EmailService();
    
    if (lead.email) {
      await emailService.sendEmail({
        to: lead.email,
        subject: 'We\'d Love Your Feedback!',
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || 'Valued Customer'},</p>
          <p>We hope you enjoyed your recent visit! We'd love to hear about your experience.</p>
          <p>Please take a moment to share your feedback with us.</p>
        </div>`,
        text: 'We\'d love your feedback on your recent visit!',
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        feedbackRequestSent: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to request feedback: ${error.message}`,
    };
  }
}

/**
 * Send special offer
 */
async function sendSpecialOffer(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  const actionConfig = task.actionConfig as any;
  const offerTitle = actionConfig?.title || 'Special Offer';
  const offerDescription = actionConfig?.description || 'Enjoy a special discount on your next visit!';
  const discountCode = actionConfig?.discountCode || `SAVE${Math.floor(Math.random() * 1000)}`;

  try {
    const results: TaskResult[] = [];

    if (lead.phone) {
      try {
        await sendSMS(lead.phone, `${offerTitle}: ${offerDescription} Use code: ${discountCode}`);
        results.push({ success: true, data: { channel: 'SMS' } });
      } catch (error: any) {
        results.push({ success: false, error: `SMS failed: ${error.message}` });
      }
    }

    if (lead.email) {
      try {
        const emailService = new EmailService();
        await emailService.sendEmail({
          to: lead.email,
          subject: offerTitle,
          html: `<div style="font-family: Arial, sans-serif;">
            <p>Dear ${lead.contactPerson || 'Valued Customer'},</p>
            <p>${offerDescription}</p>
            <p><strong>Discount Code: ${discountCode}</strong></p>
          </div>`,
          text: `${offerDescription} Use code: ${discountCode}`,
          userId: instance.userId,
        });
        results.push({ success: true, data: { channel: 'Email' } });
      } catch (error: any) {
        results.push({ success: false, error: `Email failed: ${error.message}` });
      }
    }

    return {
      success: results.every(r => r.success),
      data: {
        offerTitle,
        discountCode,
        channels: results,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to send offer: ${error.message}`,
    };
  }
}

/**
 * Send birthday greeting
 */
async function sendBirthdayGreeting(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No customer found' };
  }

  const actionConfig = task.actionConfig as any;
  const birthdayDiscount = actionConfig?.discountCode || `BDAY${Math.floor(Math.random() * 100)}`;

  try {
    const emailService = new EmailService();
    
    if (lead.email) {
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Happy Birthday!',
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || 'Valued Customer'},</p>
          <p>🎉 Happy Birthday! 🎉</p>
          <p>We hope your special day is filled with joy! As a birthday gift, enjoy a special discount on your next visit.</p>
          <p><strong>Birthday Code: ${birthdayDiscount}</strong></p>
        </div>`,
        text: 'Happy Birthday! Use code ' + birthdayDiscount + ' for a special discount!',
        userId: instance.userId,
      });
    }

    if (lead.phone) {
      await sendSMS(lead.phone, `🎉 Happy Birthday! Use code ${birthdayDiscount} for a special birthday discount!`);
    }

    return {
      success: true,
      data: {
        birthdayGreetingSent: true,
        discountCode: birthdayDiscount,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to send birthday greeting: ${error.message}`,
    };
  }
}
