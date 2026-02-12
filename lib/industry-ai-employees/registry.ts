/**
 * Industry AI Employee Registry
 * Maps each industry to its AI employee module (configs, prompts)
 * REAL_ESTATE uses its own system (REAIEmployeeAgent) - not in this registry
 */

import { Industry } from '@prisma/client';
import type { IndustryAIEmployeeModule } from './types';
import { DENTAL_EMPLOYEE_CONFIGS } from './dental/config';
import { DENTAL_EMPLOYEE_PROMPTS } from './dental/prompts';
import { DentistAIEmployeeType } from '@prisma/client';

const DENTAL_EMPLOYEE_TYPES = Object.keys(DENTAL_EMPLOYEE_CONFIGS) as DentistAIEmployeeType[];

const DENTAL_MODULE: IndustryAIEmployeeModule = {
  industry: 'DENTIST',
  employeeTypes: DENTAL_EMPLOYEE_TYPES,
  configs: DENTAL_EMPLOYEE_CONFIGS as Record<string, import('./types').IndustryEmployeeConfig>,
  prompts: DENTAL_EMPLOYEE_PROMPTS as Record<string, import('./types').IndustryEmployeePrompt>,
  fieldLabels: { contact: 'Patient', deal: 'Appointment' },
};

export const INDUSTRY_AI_EMPLOYEE_REGISTRY: Partial<Record<Industry, IndustryAIEmployeeModule>> = {
  DENTIST: DENTAL_MODULE,
  // MEDICAL, RESTAURANT, CONSTRUCTION, etc. - to be added
};

export function hasIndustryAIEmployees(industry: Industry | null | undefined): boolean {
  if (!industry || industry === 'REAL_ESTATE') return false;
  return industry in INDUSTRY_AI_EMPLOYEE_REGISTRY;
}

export function getIndustryAIEmployeeModule(
  industry: Industry
): IndustryAIEmployeeModule | null {
  return INDUSTRY_AI_EMPLOYEE_REGISTRY[industry] ?? null;
}

export function getIndustryEmployeeTypes(industry: Industry): string[] {
  const module = getIndustryAIEmployeeModule(industry);
  return module?.employeeTypes ?? [];
}
