/**
 * Default Contact workflow for Industry Auto-Run
 * Creates a minimal workflow when user enables Auto-Run for an industry AI employee
 * (e.g. APPOINTMENT_SCHEDULER for DENTIST = "Contact New Patient")
 */

import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';
import { getIndustryConfig } from '@/lib/workflows/industry-configs';

/**
 * Create default Contact workflow for an industry AI employee
 */
export async function createDefaultIndustryContactWorkflow(
  userId: string,
  industry: Industry,
  employeeType: string
): Promise<{ id: string; name: string }> {
  const industryConfig = getIndustryConfig(industry);
  const contactLabel = industryConfig?.fieldLabels?.contact || 'Contact';

  const workflow = await prisma.workflowTemplate.create({
    data: {
      userId,
      industry,
      name: `Contact New ${contactLabel}`,
      type: 'CUSTOM',
      description: `Instant response to new ${contactLabel.toLowerCase()}s - AI voice call and SMS. Customize this workflow to add more steps.`,
      isDefault: false,
      isActive: true,
      tasks: {
        create: [
          {
            name: `Contact New ${contactLabel}`,
            description: `Instant AI voice call and SMS to engage new ${contactLabel.toLowerCase()} within 60 seconds`,
            taskType: 'LEAD_RESEARCH',
            assignedAgentType: employeeType,
            delayValue: 0,
            delayUnit: 'MINUTES',
            isHITL: false,
            isOptional: false,
            position: { row: 0, col: 0 },
            displayOrder: 1,
            branchCondition: undefined,
            actionConfig: {
              actions: ['voice_call', 'sms'],
            },
          },
        ],
      },
    },
    include: {
      tasks: { orderBy: { displayOrder: 'asc' } },
    },
  });

  return { id: workflow.id, name: workflow.name };
}

/**
 * Check if user has any workflow with this employee type assigned for this industry
 */
export async function hasIndustryContactWorkflow(
  userId: string,
  industry: Industry,
  employeeType: string
): Promise<boolean> {
  const count = await prisma.workflowTask.count({
    where: {
      template: {
        userId,
        industry,
        isActive: true,
      },
      assignedAgentType: employeeType,
    },
  });
  return count > 0;
}
