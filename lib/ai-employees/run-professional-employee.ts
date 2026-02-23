/**
 * Execute Professional AI Employee tasks (Phase 4)
 * Professional employees are conversational; scheduled runs create digest tasks
 */

import { getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import type { ProfessionalAIEmployeeType } from '@prisma/client';
import { PROFESSIONAL_EMPLOYEE_CONFIGS } from '@/lib/professional-ai-employees/config';

export interface ProfessionalExecutionResult {
  success: boolean;
  employeeType: string;
  tasksCompleted: number;
  summary: string;
  details?: Record<string, unknown>;
}

export async function executeProfessionalEmployee(
  userId: string,
  employeeType: ProfessionalAIEmployeeType,
  options?: { storeHistory?: boolean }
): Promise<ProfessionalExecutionResult> {
  const config = PROFESSIONAL_EMPLOYEE_CONFIGS[employeeType as keyof typeof PROFESSIONAL_EMPLOYEE_CONFIGS];
  if (!config) {
    return {
      success: false,
      employeeType: String(employeeType),
      tasksCompleted: 0,
      summary: `Unknown professional type: ${employeeType}`,
    };
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // Create a "Daily check-in" task for the user - AI employee ran, ready for conversation
  const task = await db.task.create({
    data: {
      userId,
      title: `${config.name} (${config.title}) — Daily check-in ready`,
      description: `Your ${config.title} is ready for today. Use Talk to start a conversation.`,
      status: 'TODO',
      priority: 'MEDIUM',
      category: 'AI_EMPLOYEE',
      aiSuggested: true,
      autoCreated: true,
      automationRule: 'AI_EMPLOYEE_DAILY',
    } as any,
  });

  // TODO: Add ProfessionalAIEmployeeExecution model for history
  return {
    success: true,
    employeeType: String(employeeType),
    tasksCompleted: 1,
    summary: `Created daily check-in task for ${config.title}`,
    details: { taskId: task.id },
  };
}
