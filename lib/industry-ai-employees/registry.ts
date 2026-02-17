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
import { MEDICAL_EMPLOYEE_CONFIGS } from './medical/config';
import { MEDICAL_EMPLOYEE_PROMPTS } from './medical/prompts';
import { MEDICAL_SPA_EMPLOYEE_CONFIGS } from './medical-spa/config';
import { MEDICAL_SPA_EMPLOYEE_PROMPTS } from './medical-spa/prompts';
import { OPTOMETRIST_EMPLOYEE_CONFIGS } from './optometrist/config';
import { OPTOMETRIST_EMPLOYEE_PROMPTS } from './optometrist/prompts';
import { HEALTH_CLINIC_EMPLOYEE_CONFIGS } from './health-clinic/config';
import { HEALTH_CLINIC_EMPLOYEE_PROMPTS } from './health-clinic/prompts';
import { HOSPITAL_EMPLOYEE_CONFIGS } from './hospital/config';
import { HOSPITAL_EMPLOYEE_PROMPTS } from './hospital/prompts';
import { TECHNOLOGY_EMPLOYEE_CONFIGS } from './technology/config';
import { TECHNOLOGY_EMPLOYEE_PROMPTS } from './technology/prompts';
import { SPORTS_CLUB_EMPLOYEE_CONFIGS } from './sports-club/config';
import { SPORTS_CLUB_EMPLOYEE_PROMPTS } from './sports-club/prompts';
import { RESTAURANT_EMPLOYEE_CONFIGS } from './restaurant/config';
import { RESTAURANT_EMPLOYEE_PROMPTS } from './restaurant/prompts';
import { CONSTRUCTION_EMPLOYEE_CONFIGS } from './construction/config';
import { CONSTRUCTION_EMPLOYEE_PROMPTS } from './construction/prompts';
import { ACCOUNTING_EMPLOYEE_CONFIGS } from './accounting/config';
import { ACCOUNTING_EMPLOYEE_PROMPTS } from './accounting/prompts';
import { LAW_EMPLOYEE_CONFIGS } from './law/config';
import { LAW_EMPLOYEE_PROMPTS } from './law/prompts';
import { ORTHODONTIST_EMPLOYEE_CONFIGS } from './orthodontist/config';
import { ORTHODONTIST_EMPLOYEE_PROMPTS } from './orthodontist/prompts';

const DENTAL_EMPLOYEE_TYPES = Object.keys(DENTAL_EMPLOYEE_CONFIGS) as DentistAIEmployeeType[];

const DENTAL_MODULE: IndustryAIEmployeeModule = {
  industry: 'DENTIST',
  employeeTypes: DENTAL_EMPLOYEE_TYPES,
  configs: DENTAL_EMPLOYEE_CONFIGS as Record<string, import('./types').IndustryEmployeeConfig>,
  prompts: DENTAL_EMPLOYEE_PROMPTS as Record<string, import('./types').IndustryEmployeePrompt>,
  fieldLabels: { contact: 'Patient', deal: 'Appointment' },
};

const MEDICAL_MODULE: IndustryAIEmployeeModule = {
  industry: 'MEDICAL',
  employeeTypes: Object.keys(MEDICAL_EMPLOYEE_CONFIGS),
  configs: MEDICAL_EMPLOYEE_CONFIGS,
  prompts: MEDICAL_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Patient', deal: 'Appointment' },
};

const MEDICAL_SPA_MODULE: IndustryAIEmployeeModule = {
  industry: 'MEDICAL_SPA',
  employeeTypes: Object.keys(MEDICAL_SPA_EMPLOYEE_CONFIGS),
  configs: MEDICAL_SPA_EMPLOYEE_CONFIGS,
  prompts: MEDICAL_SPA_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Client', deal: 'Appointment' },
};

const OPTOMETRIST_MODULE: IndustryAIEmployeeModule = {
  industry: 'OPTOMETRIST',
  employeeTypes: Object.keys(OPTOMETRIST_EMPLOYEE_CONFIGS),
  configs: OPTOMETRIST_EMPLOYEE_CONFIGS,
  prompts: OPTOMETRIST_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Patient', deal: 'Appointment' },
};

const HEALTH_CLINIC_MODULE: IndustryAIEmployeeModule = {
  industry: 'HEALTH_CLINIC',
  employeeTypes: Object.keys(HEALTH_CLINIC_EMPLOYEE_CONFIGS),
  configs: HEALTH_CLINIC_EMPLOYEE_CONFIGS,
  prompts: HEALTH_CLINIC_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Patient', deal: 'Appointment' },
};

const HOSPITAL_MODULE: IndustryAIEmployeeModule = {
  industry: 'HOSPITAL',
  employeeTypes: Object.keys(HOSPITAL_EMPLOYEE_CONFIGS),
  configs: HOSPITAL_EMPLOYEE_CONFIGS,
  prompts: HOSPITAL_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Patient', deal: 'Appointment' },
};

const TECHNOLOGY_MODULE: IndustryAIEmployeeModule = {
  industry: 'TECHNOLOGY',
  employeeTypes: Object.keys(TECHNOLOGY_EMPLOYEE_CONFIGS),
  configs: TECHNOLOGY_EMPLOYEE_CONFIGS,
  prompts: TECHNOLOGY_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Lead', deal: 'Deal' },
};

const SPORTS_CLUB_MODULE: IndustryAIEmployeeModule = {
  industry: 'SPORTS_CLUB',
  employeeTypes: Object.keys(SPORTS_CLUB_EMPLOYEE_CONFIGS),
  configs: SPORTS_CLUB_EMPLOYEE_CONFIGS,
  prompts: SPORTS_CLUB_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Member', deal: 'Registration' },
};

const RESTAURANT_MODULE: IndustryAIEmployeeModule = {
  industry: 'RESTAURANT',
  employeeTypes: Object.keys(RESTAURANT_EMPLOYEE_CONFIGS),
  configs: RESTAURANT_EMPLOYEE_CONFIGS,
  prompts: RESTAURANT_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Customer', deal: 'Reservation' },
};

const CONSTRUCTION_MODULE: IndustryAIEmployeeModule = {
  industry: 'CONSTRUCTION',
  employeeTypes: Object.keys(CONSTRUCTION_EMPLOYEE_CONFIGS),
  configs: CONSTRUCTION_EMPLOYEE_CONFIGS,
  prompts: CONSTRUCTION_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Lead', deal: 'Project' },
};

const ACCOUNTING_MODULE: IndustryAIEmployeeModule = {
  industry: 'ACCOUNTING',
  employeeTypes: Object.keys(ACCOUNTING_EMPLOYEE_CONFIGS),
  configs: ACCOUNTING_EMPLOYEE_CONFIGS,
  prompts: ACCOUNTING_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Client', deal: 'Engagement' },
};

const LAW_MODULE: IndustryAIEmployeeModule = {
  industry: 'LAW',
  employeeTypes: Object.keys(LAW_EMPLOYEE_CONFIGS),
  configs: LAW_EMPLOYEE_CONFIGS,
  prompts: LAW_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Client', deal: 'Case' },
};

const ORTHODONTIST_MODULE: IndustryAIEmployeeModule = {
  industry: 'ORTHODONTIST',
  employeeTypes: Object.keys(ORTHODONTIST_EMPLOYEE_CONFIGS),
  configs: ORTHODONTIST_EMPLOYEE_CONFIGS,
  prompts: ORTHODONTIST_EMPLOYEE_PROMPTS,
  fieldLabels: { contact: 'Patient', deal: 'Appointment' },
};

export const INDUSTRY_AI_EMPLOYEE_REGISTRY: Partial<Record<Industry, IndustryAIEmployeeModule>> = {
  DENTIST: DENTAL_MODULE,
  MEDICAL: MEDICAL_MODULE,
  MEDICAL_SPA: MEDICAL_SPA_MODULE,
  OPTOMETRIST: OPTOMETRIST_MODULE,
  HEALTH_CLINIC: HEALTH_CLINIC_MODULE,
  HOSPITAL: HOSPITAL_MODULE,
  TECHNOLOGY: TECHNOLOGY_MODULE,
  SPORTS_CLUB: SPORTS_CLUB_MODULE,
  RESTAURANT: RESTAURANT_MODULE,
  CONSTRUCTION: CONSTRUCTION_MODULE,
  ACCOUNTING: ACCOUNTING_MODULE,
  LAW: LAW_MODULE,
  ORTHODONTIST: ORTHODONTIST_MODULE,
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
