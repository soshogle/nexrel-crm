/**
 * Construction Industry Workflow Task Executor
 * Handles Construction-specific workflow actions
 */

import { WorkflowTask, WorkflowInstance } from '@prisma/client';
import { createDalContext } from '@/lib/context/industry-context';
import { leadService, taskService, dealService, getCrmDb } from '@/lib/dal';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import { CalendarService } from '@/lib/calendar/calendar-service';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute Construction-specific action
 */
export async function executeConstructionAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  switch (action) {
    case 'estimate_generation':
      return await generateEstimate(task, instance);
    case 'project_scheduling':
      return await scheduleProject(task, instance);
    case 'material_ordering':
      return await orderMaterials(task, instance);
    case 'inspection_scheduling':
      return await scheduleInspection(task, instance);
    case 'progress_update':
      return await sendProgressUpdate(task, instance);
    case 'change_order':
      return await createChangeOrder(task, instance);
    case 'project_completion':
      return await completeProject(task, instance);
    default:
      return { success: false, error: `Unknown Construction action: ${action}` };
  }
}

/**
 * Generate project estimate
 */
async function generateEstimate(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No client found' };
  }

  const actionConfig = task.actionConfig as any;
  const projectType = actionConfig?.projectType || 'Construction Project';
  const estimatedCost = actionConfig?.estimatedCost || 0;
  const projectDescription = actionConfig?.description || task.description || '';

  try {
    // Get or create default pipeline
    let pipeline = await getCrmDb(ctx).pipeline.findFirst({
      where: { userId: instance.userId, isDefault: true },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!pipeline) {
      pipeline = await getCrmDb(ctx).pipeline.create({
        data: {
          userId: instance.userId,
          name: 'Default Pipeline',
          isDefault: true,
          stages: {
            create: [
              { name: 'Prospecting', displayOrder: 0, probability: 10 },
              { name: 'Estimate', displayOrder: 1, probability: 50 },
              { name: 'Won', displayOrder: 2, probability: 100 },
            ],
          },
        },
        include: { stages: { orderBy: { displayOrder: 'asc' } } },
      });
    }

    // Use first stage or find "Estimate" stage
    const estimateStage = pipeline.stages.find(s => s.name === 'Estimate') || pipeline.stages[0];

    // Create estimate as a deal
    const estimate = await dealService.create(ctx, {
      pipeline: { connect: { id: pipeline.id } },
      stage: { connect: { id: estimateStage.id } },
      ...(instance.leadId && { lead: { connect: { id: instance.leadId } } }),
      title: `Estimate: ${projectType}`,
      value: estimatedCost,
      probability: estimateStage.probability,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      description: projectDescription,
    });

    // Create task for estimate review
    await taskService.create(ctx, {
      title: `Review Estimate: ${projectType}`,
      description: `Estimated Cost: $${estimatedCost.toLocaleString()}\n${projectDescription}`,
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      leadId: instance.leadId || undefined,
      dealId: estimate.id,
    });

    // Send estimate to client
    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: `Estimate for ${projectType}`,
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || lead.businessName},</p>
          <p>We've prepared an estimate for your ${projectType}.</p>
          <p><strong>Estimated Cost: $${estimatedCost.toLocaleString()}</strong></p>
          <p>${projectDescription}</p>
          <p>Please review and let us know if you'd like to proceed.</p>
        </div>`,
        text: `Estimate for ${projectType}: $${estimatedCost.toLocaleString()}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        estimateId: estimate.id,
        projectType,
        estimatedCost,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Construction] Failed to generate estimate:', error);
    return {
      success: false,
      error: `Failed to generate estimate: ${error.message}`,
    };
  }
}

/**
 * Schedule project
 */
async function scheduleProject(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No client found' };
  }

  const actionConfig = task.actionConfig as any;
  const projectStartDate = actionConfig?.startDate 
    ? new Date(actionConfig.startDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const projectDuration = actionConfig?.duration || 30; // days
  const projectType = actionConfig?.projectType || 'Construction Project';

  try {
    // Get or create default pipeline
    let pipeline = await getCrmDb(ctx).pipeline.findFirst({
      where: { userId: instance.userId, isDefault: true },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!pipeline) {
      pipeline = await getCrmDb(ctx).pipeline.create({
        data: {
          userId: instance.userId,
          name: 'Default Pipeline',
          isDefault: true,
          stages: {
            create: [
              { name: 'Prospecting', displayOrder: 0, probability: 10 },
              { name: 'Scheduled', displayOrder: 1, probability: 75 },
              { name: 'Won', displayOrder: 2, probability: 100 },
            ],
          },
        },
        include: { stages: { orderBy: { displayOrder: 'asc' } } },
      });
    }

    const scheduledStage = pipeline.stages.find(s => s.name === 'Scheduled') || pipeline.stages[1] || pipeline.stages[0];

    // Create project as a deal
    const project = await dealService.create(ctx, {
      pipeline: { connect: { id: pipeline.id } },
      stage: { connect: { id: scheduledStage.id } },
      ...(instance.leadId && { lead: { connect: { id: instance.leadId } } }),
      title: projectType,
      probability: scheduledStage.probability,
      expectedCloseDate: new Date(projectStartDate.getTime() + projectDuration * 24 * 60 * 60 * 1000),
      description: `Project scheduled to start on ${projectStartDate.toLocaleDateString()}`,
    });

    // Create calendar appointment for project kickoff
    try {
      await getCrmDb(ctx).bookingAppointment.create({
        data: {
          userId: instance.userId,
          customerName: lead.contactPerson || lead.businessName || 'Contact',
          customerEmail: lead.email || undefined,
          customerPhone: lead.phone || '',
          appointmentDate: projectStartDate,
          duration: 120, // 2 hours
          status: 'SCHEDULED',
          notes: `Project kickoff for ${projectType}`,
          leadId: instance.leadId || undefined,
        },
      });
    } catch (error) {
      console.error('[Construction] Failed to create calendar appointment:', error);
    }

    // Notify client
    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: `Project Scheduled: ${projectType}`,
        html: `<p>Your ${projectType} is scheduled to begin on ${projectStartDate.toLocaleDateString()}.</p>`,
        text: `Project scheduled for ${projectStartDate.toLocaleDateString()}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        projectId: project.id,
        startDate: projectStartDate.toISOString(),
        duration: projectDuration,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to schedule project: ${error.message}`,
    };
  }
}

/**
 * Order materials
 */
async function orderMaterials(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const actionConfig = task.actionConfig as any;
  const materials = actionConfig?.materials || ['Standard Materials'];
  const supplier = actionConfig?.supplier || 'Default Supplier';

  try {
    // Create task for material ordering
    await taskService.create(ctx, {
      title: `Order Materials: ${materials.join(', ')}`,
      description: `Supplier: ${supplier}\nMaterials: ${materials.join(', ')}`,
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
      dealId: instance.dealId || undefined,
      leadId: instance.leadId || undefined,
    });

    return {
      success: true,
      data: {
        materials,
        supplier,
        orderTaskCreated: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to order materials: ${error.message}`,
    };
  }
}

/**
 * Schedule inspection
 */
async function scheduleInspection(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  const actionConfig = task.actionConfig as any;
  const inspectionDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const inspectionType = actionConfig?.type || 'Building Inspection';

  try {
    // Create inspection appointment
    const inspection = await getCrmDb(ctx).bookingAppointment.create({
      data: {
        userId: instance.userId,
        leadId: instance.leadId || undefined,
        customerName: lead?.contactPerson || lead?.businessName || 'Client',
        customerEmail: lead?.email || undefined,
        customerPhone: lead?.phone || '',
        appointmentDate: inspectionDate,
        duration: 60, // 1 hour
        status: 'SCHEDULED',
        meetingType: 'IN_PERSON',
        notes: `Inspection Type: ${inspectionType}`,
      },
    });

    // Calendar sync is handled via bookingAppointment above

    return {
      success: true,
      data: {
        inspectionId: inspection.id,
        inspectionDate: inspectionDate.toISOString(),
        inspectionType,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to schedule inspection: ${error.message}`,
    };
  }
}

/**
 * Send progress update
 */
async function sendProgressUpdate(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No client found' };
  }

  const actionConfig = task.actionConfig as any;
  const progressPercentage = actionConfig?.progress || 50;
  const updateMessage = actionConfig?.message || `Project is ${progressPercentage}% complete.`;

  try {
    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Project Progress Update',
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || lead.businessName},</p>
          <p>${updateMessage}</p>
          <p><strong>Progress: ${progressPercentage}%</strong></p>
        </div>`,
        text: `${updateMessage} Progress: ${progressPercentage}%`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        progressPercentage,
        updateSent: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to send progress update: ${error.message}`,
    };
  }
}

/**
 * Create change order
 */
async function createChangeOrder(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  const actionConfig = task.actionConfig as any;
  const changeDescription = actionConfig?.description || task.description || 'Change order';
  const additionalCost = actionConfig?.cost || 0;

  try {
    // Create change order task
    await taskService.create(ctx, {
      title: `Change Order: ${changeDescription}`,
      description: `Additional Cost: $${additionalCost.toLocaleString()}\n${changeDescription}`,
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      leadId: instance.leadId || undefined,
      dealId: instance.dealId || undefined,
    });

    // Notify client if available
    if (lead?.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Change Order Request',
        html: `<p>A change order has been requested: ${changeDescription}</p><p>Additional Cost: $${additionalCost.toLocaleString()}</p>`,
        text: `Change order: ${changeDescription}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        changeOrderCreated: true,
        additionalCost,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to create change order: ${error.message}`,
    };
  }
}

/**
 * Complete project
 */
async function completeProject(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const deal = instance.dealId 
    ? await dealService.findUnique(ctx, instance.dealId)
    : null;

  if (!deal) {
    return { success: false, error: 'No project found' };
  }

  try {
    // Get deal to find pipeline
    const dealToUpdate = await getCrmDb(ctx).deal.findUnique({
      where: { id: deal.id },
      include: { pipeline: { include: { stages: true } } },
    });

    if (dealToUpdate) {
      // Find completed stage or use last stage
      const completedStage = dealToUpdate.pipeline.stages.find(s => s.name === 'Completed' || s.name === 'Won') 
        || dealToUpdate.pipeline.stages[dealToUpdate.pipeline.stages.length - 1];

      if (completedStage) {
        await dealService.update(ctx, deal.id, {
          stageId: completedStage.id,
          probability: 100,
        });
      }
    }

    // Get lead for notification
    const lead = deal.leadId 
      ? await leadService.findUnique(ctx, deal.leadId)
      : null;

    if (lead?.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Project Completed',
        html: `<p>Congratulations! Your project "${deal.title}" has been completed.</p><p>Thank you for choosing us!</p>`,
        text: `Project ${deal.title} completed`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        projectId: deal.id,
        completed: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to complete project: ${error.message}`,
    };
  }
}
