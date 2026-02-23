/**
 * Template helper - fetch custom templates for AI employee tasks
 */

import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';

export interface TaskTemplate {
  smsTemplate?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
}

/**
 * Get custom template for a task. Returns null if none.
 */
export async function getTaskTemplate(
  userId: string,
  source: 'industry' | 're' | 'professional',
  industry: Industry | null,
  employeeType: string,
  taskKey: string
): Promise<TaskTemplate | null> {
  // findFirst: Prisma compound unique with nullable industry rejects null in findUnique where
  const template = await (prisma as any).aIEmployeeTaskTemplate.findFirst({
    where: {
      userId,
      source,
      industry: source === 'industry' ? industry : null,
      employeeType,
      taskKey,
    },
  });

  if (!template) return null;
  return {
    smsTemplate: template.smsTemplate,
    emailSubject: template.emailSubject,
    emailBody: template.emailBody,
  };
}
