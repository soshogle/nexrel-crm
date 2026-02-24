/**
 * Execute Professional AI Employee tasks (Phase 4)
 * Professional employees are conversational; scheduled runs create digest tasks
 * Phase 3: Only creates tasks for enabled capabilities (respects toggles)
 */

import { getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import type { ProfessionalAIEmployeeType } from '@prisma/client';
import { PROFESSIONAL_EMPLOYEE_CONFIGS } from '@/lib/professional-ai-employees/config';

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

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
  options?: { storeHistory?: boolean; enabledTaskKeys?: Set<string> }
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

  const enabledTaskKeys = options?.enabledTaskKeys ?? new Set<string>(['run']);
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // Per-capability: create a task for each enabled capability
  // If "run" is the only enabled key (no config), create single daily check-in
  const capabilities = config.capabilities ?? [];
  const capabilityTaskKeys = capabilities.map((cap) => slugify(cap));
  const hasCapabilityConfig = capabilityTaskKeys.length > 0;
  const anyCapabilityEnabled = capabilityTaskKeys.some((k) => enabledTaskKeys.has(k));
  const runOnly = enabledTaskKeys.has('run') && !anyCapabilityEnabled;

  let tasksCreated = 0;
  const taskIds: string[] = [];

  if (hasCapabilityConfig && !runOnly) {
    for (let i = 0; i < capabilities.length; i++) {
      const cap = capabilities[i];
      const taskKey = capabilityTaskKeys[i];
      if (!enabledTaskKeys.has(taskKey)) continue;

      const task = await db.task.create({
        data: {
          userId,
          title: `${config.name} — ${cap} ready`,
          description: `Your ${config.title} is ready for ${cap}. Use Talk to start a conversation.`,
          status: 'TODO',
          priority: 'MEDIUM',
          category: 'AI_EMPLOYEE',
          aiSuggested: true,
          autoCreated: true,
          automationRule: 'AI_EMPLOYEE_DAILY',
        } as any,
      });
      tasksCreated++;
      taskIds.push(task.id);
    }
  }

  // Fallback: single daily check-in when "run" only or no capability config
  if (tasksCreated === 0) {
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
    tasksCreated = 1;
    taskIds.push(task.id);
  }

  return {
    success: true,
    employeeType: String(employeeType),
    tasksCompleted: tasksCreated,
    summary: tasksCreated === 1
      ? `Created daily check-in task for ${config.title}`
      : `Created ${tasksCreated} capability tasks for ${config.title}`,
    details: { taskIds },
  };
}
