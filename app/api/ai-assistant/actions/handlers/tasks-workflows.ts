import { getCrmDb, taskService, leadService } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";

export async function createTask(userId: string, params: any) {
  const { title, description, dueDate, leadId, dealId, priority } = params;

  if (!title) {
    throw new Error("Task title is required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const task = await taskService.create(ctx, {
    title,
    description: description || null,
    dueDate: dueDate ? new Date(dueDate) : null,
    leadId: leadId || null,
    dealId: dealId || null,
    priority: (priority as any) || "MEDIUM",
    status: "TODO",
  });

  await db.taskActivity.create({
    data: {
      taskId: task.id,
      userId: ctx.userId,
      action: "CREATED",
      newValue: "Task created",
    },
  });

  return {
    message: `✓ Task "${title}" created successfully!`,
    task: {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status,
    },
  };
}

export async function listTasks(userId: string, params: any) {
  const { status, overdue, limit = 20 } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  const where: any = { userId: ctx.userId };
  if (status) where.status = status;
  if (overdue === true) {
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ["COMPLETED", "CANCELLED"] };
  }

  const tasks = await db.task.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      lead: { select: { businessName: true, contactPerson: true } },
      deal: { select: { title: true } },
    },
  });

  return {
    message: `Found ${tasks.length} task(s)`,
    count: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      lead: t.lead,
      deal: t.deal,
    })),
  };
}

export async function completeTask(userId: string, params: any) {
  const { taskId, taskTitle } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let task;
  if (taskId) {
    task = await db.task.findFirst({
      where: { id: taskId, userId: ctx.userId },
    });
  } else if (taskTitle) {
    task = await db.task.findFirst({
      where: {
        userId: ctx.userId,
        title: { contains: taskTitle, mode: "insensitive" },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    });
  }

  if (!task) {
    throw new Error(taskId ? "Task not found" : `No matching task found for "${taskTitle}"`);
  }

  await taskService.update(ctx, task.id, { status: "COMPLETED", completedAt: new Date(), progressPercent: 100 });

  await db.taskActivity.create({
    data: {
      taskId: task.id,
      userId: ctx.userId,
      action: "STATUS_CHANGED",
      oldValue: task.status,
      newValue: "COMPLETED",
    },
  });

  return {
    message: `✓ Task "${task.title}" marked as complete!`,
    task: { id: task.id, title: task.title },
  };
}

export async function updateTask(userId: string, params: any) {
  const { taskId, taskTitle, title, dueDate, priority } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let task;
  if (taskId) {
    task = await db.task.findFirst({ where: { id: taskId, userId: ctx.userId } });
  } else if (taskTitle) {
    task = await db.task.findFirst({ where: { userId: ctx.userId, title: { contains: taskTitle, mode: "insensitive" } } });
  }

  if (!task) throw new Error("Task not found");

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (dueDate !== undefined) updates.dueDate = new Date(dueDate);
  if (priority !== undefined) updates.priority = priority;

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field (title, dueDate, or priority) is required to update");
  }

  await taskService.update(ctx, task.id, updates);

  return {
    message: `Task "${task.title}" updated successfully!`,
    task: { id: task.id, title: title ?? task.title },
  };
}

export async function cancelTask(userId: string, params: any) {
  const { taskId, taskTitle } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let task;
  if (taskId) {
    task = await db.task.findFirst({ where: { id: taskId, userId: ctx.userId } });
  } else if (taskTitle) {
    task = await db.task.findFirst({ where: { userId: ctx.userId, title: { contains: taskTitle, mode: "insensitive" } } });
  }

  if (!task) throw new Error("Task not found");

  await taskService.update(ctx, task.id, { status: "CANCELLED" });

  return {
    message: `Task "${task.title}" cancelled.`,
    taskId: task.id,
  };
}

export async function rescheduleTask(userId: string, params: any) {
  const { taskId, taskTitle, dueDate } = params;
  if (!dueDate) throw new Error("New due date is required (YYYY-MM-DD)");

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  let task;
  if (taskId) {
    task = await db.task.findFirst({ where: { id: taskId, userId: ctx.userId } });
  } else if (taskTitle) {
    task = await db.task.findFirst({
      where: {
        userId: ctx.userId,
        title: { contains: taskTitle, mode: "insensitive" },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    });
  }
  if (!task) throw new Error(taskId ? "Task not found" : `No matching task found for "${taskTitle}"`);

  const newDueDate = new Date(dueDate);
  if (isNaN(newDueDate.getTime())) throw new Error("Invalid date format. Use YYYY-MM-DD");

  await taskService.update(ctx, task.id, { dueDate: newDueDate });

  await db.taskActivity.create({
    data: {
      taskId: task.id,
      userId: ctx.userId,
      action: "UPDATED",
      oldValue: task.dueDate?.toISOString() || "",
      newValue: newDueDate.toISOString(),
    },
  });

  return {
    message: `✓ Task "${task.title}" rescheduled to ${newDueDate.toLocaleDateString()}`,
    task: { id: task.id, title: task.title, dueDate: newDueDate },
  };
}

export async function createBulkTasks(userId: string, params: any) {
  const { taskTitle, period = "last_week", dueInDays = 1 } = params;

  if (!taskTitle) {
    throw new Error("Task title is required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const now = new Date();
  let startDate: Date;
  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "last_week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  }

  const leads = await leadService.findMany(ctx, {
    where: { createdAt: { gte: startDate } },
    take: 50,
  });

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + dueInDays);

  const created = [];
  for (const lead of leads) {
    const title = taskTitle.replace(/\{name\}/g, lead.contactPerson || lead.businessName || "Contact");
    const task = await taskService.create(ctx, {
      leadId: lead.id,
      title,
      dueDate,
      status: "TODO",
      priority: "MEDIUM",
    });
    created.push({ id: task.id, title, lead: lead.contactPerson || lead.businessName });
  }

  return {
    message: `✓ Created ${created.length} task(s) for leads from ${period}`,
    count: created.length,
    tasks: created,
  };
}

export async function createWorkflow(userId: string, params: any) {
  const { description, goal, keywords, autoReply, trigger, actions } = params;

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // If description is provided, use AI to generate the workflow
  if (description) {
    const { aiWorkflowGenerator } = await import('@/lib/ai-workflow-generator');
    
    // Get user context for workflow generation
    const [pipelines, leadStatuses, user] = await Promise.all([
      db.pipeline.findMany({
        where: { userId: ctx.userId },
        include: { stages: true },
      }),
      db.lead.findMany({
        where: { userId: ctx.userId },
        distinct: ['status'],
        select: { status: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { language: true },
      }),
    ]);

    // Get user's industry and role for dental context
    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { industry: true, role: true },
    });

    const isDental = userRecord?.industry === 'DENTIST';
    const userRole = userRecord?.role || 'USER';

    // Import dental role helper if dental context
    let dentalRole = 'practitioner';
    if (isDental) {
      const { getUserDentalRole } = await import('@/lib/dental/role-types');
      dentalRole = getUserDentalRole(userRole, userRecord);
    }

    const context = {
      existingPipelines: pipelines,
      existingLeadStatuses: leadStatuses.map(l => l.status).filter(Boolean) as string[],
      industry: userRecord?.industry,
      isDental,
      role: isDental ? dentalRole : undefined,
    };

    // Get user's language preference
    const userLanguage = user?.language || 'en';
    
    // Generate workflow from natural language description
    const generatedWorkflow = await aiWorkflowGenerator.generateWorkflow({
      description: description + (goal ? ` Goal: ${goal}` : ''),
      userId,
      userLanguage: userLanguage,
      context,
    });

    // Create the workflow with generated configuration
    const workflow = await db.workflow.create({
      data: {
        userId: ctx.userId,
        name: generatedWorkflow.name,
        description: generatedWorkflow.description,
        triggerType: generatedWorkflow.triggerType as any,
        triggerConfig: generatedWorkflow.triggerConfig,
        status: 'ACTIVE',
        metadata: isDental ? {
          role: dentalRole,
          industry: 'DENTIST',
          targetRole: isDental ? (dentalRole === 'practitioner' ? 'practitioner' : dentalRole === 'admin_assistant' ? 'admin_assistant' : 'both') : undefined,
        } : undefined,
        actions: {
          create: generatedWorkflow.actions.map((action) => ({
            type: action.type as any,
            displayOrder: action.displayOrder,
            actionConfig: action.actionConfig,
            delayMinutes: action.delayMinutes,
          })),
        },
      },
      include: {
        actions: true,
      },
    });

    // Helper function to get action summary
    const getActionSummary = (action: any) => {
      const config = action.actionConfig || {};
      switch (action.type) {
        case 'MAKE_OUTBOUND_CALL':
          return `Call: ${config.purpose || 'Voice call'}`;
        case 'SEND_EMAIL':
          return `Email: ${config.subject || 'No subject'}`;
        case 'SEND_SMS':
          return `SMS: ${(config.template || config.message || '').substring(0, 50)}...`;
        case 'WAIT_DELAY':
          const minutes = action.delayMinutes || 0;
          if (minutes >= 10080) return `Wait: ${Math.round(minutes / 10080)} week(s)`;
          if (minutes >= 1440) return `Wait: ${Math.round(minutes / 1440)} day(s)`;
          if (minutes >= 60) return `Wait: ${Math.round(minutes / 60)} hour(s)`;
          return `Wait: ${minutes} minute(s)`;
        case 'AI_GENERATE_MESSAGE':
          return `AI Message: ${(config.prompt || '').substring(0, 50)}...`;
        default:
          return action.type.replace(/_/g, ' ');
      }
    };

    // Include suggestions from AI generator if available
    const suggestions = generatedWorkflow.suggestions || [];
    
    return {
      message: `✅ Workflow "${workflow.name}" created successfully!`,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        trigger: workflow.triggerType,
        actionsCount: workflow.actions.length,
        status: workflow.status,
      },
      suggestions: suggestions.length > 0 ? {
        items: suggestions,
        message: "The AI has some suggestions to improve this workflow:",
        canAccept: true,
        canReject: true,
      } : undefined,
      workflowDetails: {
        triggerType: workflow.triggerType,
        triggerConfig: workflow.triggerConfig,
        actions: workflow.actions.map((action: any) => ({
          type: action.type,
          displayOrder: action.displayOrder,
          delayMinutes: action.delayMinutes,
          summary: getActionSummary(action),
        })),
      },
    };
  }

  // Fallback: Manual workflow creation (legacy)
  const name = params.name || 'New Workflow';
  
  const workflow = await db.workflow.create({
    data: {
      userId: ctx.userId,
      name,
      triggerType: trigger || "MANUAL",
      status: "ACTIVE",
      triggerConfig: keywords ? { keywords } : {},
      actions: {
        create: (actions || []).map((action: string, index: number) => ({
          type: "SEND_EMAIL",
          displayOrder: index,
          actionConfig: { action },
        })),
      },
    },
    include: {
      actions: true,
    },
  });

  return {
    message: `✅ Workflow "${name}" has been created successfully!`,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      triggerType: workflow.triggerType,
      stepsCount: workflow.actions.length,
      status: workflow.status,
    },
    nextSteps: [
      "Test the workflow",
      "Add more steps if needed",
      "Monitor workflow executions",
    ],
  };
}

export async function addWorkflowTask(userId: string, params: any) {
  const { workflowId, name, taskType = 'CUSTOM', description = '' } = params;
  if (!workflowId || !name) {
    return { success: false, error: 'workflowId and name are required' };
  }
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const existing = await db.workflowTemplate.findFirst({
    where: { id: workflowId, userId: ctx.userId },
    include: { tasks: { orderBy: { displayOrder: 'asc' } } },
  });
  if (!existing) {
    return { success: false, error: 'Workflow not found' };
  }
  const maxOrder = existing.tasks.length > 0
    ? Math.max(...existing.tasks.map((t) => t.displayOrder))
    : 0;
  const task = await db.workflowTask.create({
    data: {
      templateId: workflowId,
      name,
      description: description || '',
      taskType: taskType || 'CUSTOM',
      assignedAgentType: null,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: { row: Math.floor(maxOrder / 3), col: maxOrder % 3 },
      displayOrder: maxOrder + 1,
      actionConfig: { actions: [] },
    },
  });
  return {
    success: true,
    message: `Task "${name}" added to workflow`,
    task: { id: task.id, name: task.name, taskType: task.taskType },
  };
}

export async function createAppointment(userId: string, params: any) {
  const { customerName, customerEmail, customerPhone, date, time, duration } = params;

  if (!customerName) {
    throw new Error("Customer name is required");
  }

  if (!customerEmail) {
    throw new Error("Customer email is required");
  }

  if (!date || !time) {
    throw new Error("Date and time are required");
  }

  // Parse date and time
  const appointmentDate = new Date(`${date}T${time}`);

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const appointment = await db.bookingAppointment.create({
    data: {
      userId: ctx.userId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || "",
      appointmentDate,
      duration: duration || 30,
      status: "SCHEDULED",
    },
  });

  return {
    message: `✅ Appointment with ${customerName} has been scheduled successfully!`,
    appointment: {
      id: appointment.id,
      customerName: appointment.customerName,
      date: appointment.appointmentDate.toLocaleDateString(),
      time: appointment.appointmentDate.toLocaleTimeString(),
      status: appointment.status,
    },
    nextSteps: [
      "Send calendar invites to attendees",
      "Add meeting notes or agenda",
      "Set up reminders",
    ],
  };
}

export async function listAppointments(userId: string, params: any) {
  const { date, limit = 20 } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  const where: any = { userId: ctx.userId };
  if (date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.appointmentDate = { gte: start, lt: end };
  }

  const appointments = await db.bookingAppointment.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { appointmentDate: "asc" },
  });

  return {
    message: `Found ${appointments.length} appointment(s)`,
    count: appointments.length,
    appointments: appointments.map((a) => ({
      id: a.id,
      customerName: a.customerName,
      appointmentDate: a.appointmentDate,
      duration: a.duration,
      status: a.status,
    })),
  };
}

export async function updateAppointment(userId: string, params: any) {
  const { appointmentId, customerName, date, time } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let appointment;
  if (appointmentId) {
    appointment = await db.bookingAppointment.findFirst({
      where: { id: appointmentId, userId: ctx.userId },
    });
  } else if (customerName) {
    appointment = await db.bookingAppointment.findFirst({
      where: {
        userId: ctx.userId,
        customerName: { contains: customerName, mode: "insensitive" },
        status: { not: "CANCELLED" },
      },
      orderBy: { appointmentDate: "desc" },
    });
  }

  if (!appointment) throw new Error("Appointment not found");

  const updates: any = {};
  if (date && time) {
    updates.appointmentDate = new Date(`${date}T${time}`);
  } else if (date) {
    const old = new Date(appointment.appointmentDate);
    updates.appointmentDate = new Date(`${date}T${old.toTimeString().slice(0, 5)}`);
  } else if (time) {
    const old = new Date(appointment.appointmentDate);
    updates.appointmentDate = new Date(`${old.toISOString().slice(0, 10)}T${time}`);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("Provide date and/or time to reschedule");
  }

  const updated = await db.bookingAppointment.update({
    where: { id: appointment.id },
    data: updates,
  });

  return {
    message: `Appointment with ${updated.customerName} rescheduled successfully.`,
    appointment: { id: updated.id, appointmentDate: updated.appointmentDate },
  };
}

export async function cancelAppointment(userId: string, params: any) {
  const { appointmentId, customerName } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let appointment;
  if (appointmentId) {
    appointment = await db.bookingAppointment.findFirst({
      where: { id: appointmentId, userId: ctx.userId },
    });
  } else if (customerName) {
    appointment = await db.bookingAppointment.findFirst({
      where: {
        userId: ctx.userId,
        customerName: { contains: customerName, mode: "insensitive" },
        status: { not: "CANCELLED" },
      },
      orderBy: { appointmentDate: "desc" },
    });
  }

  if (!appointment) throw new Error("Appointment not found");

  await db.bookingAppointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" as any, cancelledAt: new Date() },
  });

  return {
    message: `Appointment with ${appointment.customerName} cancelled.`,
    appointmentId: appointment.id,
  };
}

export async function createAIEmployee(userId: string, params: any) {
  const { profession, customName } = params;

  if (!profession || !customName) {
    throw new Error("profession and customName are required for AI Team employee");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const employee = await db.userAIEmployee.create({
    data: {
      userId: ctx.userId,
      profession: String(profession),
      customName: String(customName),
      isActive: true,
    },
  });

  return {
    message: `✓ AI Team employee "${customName}" (${profession}) created successfully!`,
    employee: {
      id: employee.id,
      profession: employee.profession,
      customName: employee.customName,
    },
  };
}

export async function listAIEmployees(userId: string) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const employees = await db.userAIEmployee.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: "asc" },
  });

  return {
    message: employees.length === 0
      ? "No AI Team employees yet. Create one with create_ai_employee."
      : `Found ${employees.length} AI Team employee(s)`,
    count: employees.length,
    employees: employees.map((e) => ({
      id: e.id,
      profession: e.profession,
      customName: e.customName,
      isActive: e.isActive,
    })),
  };
}
