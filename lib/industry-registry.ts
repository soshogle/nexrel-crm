/**
 * Industry Component Registry - Phase 1
 * Maps industry to UI components (workflow tabs, etc.)
 *
 * Adding a new industry = add entry here + create component.
 * No core file edits needed.
 */

import type { Industry } from '@/lib/industry-menu-config';
import type { ComponentType } from 'react';

// Lazy imports to avoid loading all industry components upfront
import { REWorkflowsTab } from '@/components/real-estate/workflows/re-workflows-tab';
import { MedicalWorkflowsTab } from '@/components/medical/workflows/medical-workflows-tab';
import { RestaurantWorkflowsTab } from '@/components/restaurant/workflows/restaurant-workflows-tab';
import { ConstructionWorkflowsTab } from '@/components/construction/workflows/construction-workflows-tab';
import { DentistWorkflowsTab } from '@/components/dentist/workflows/dentist-workflows-tab';
import { MedicalSpaWorkflowsTab } from '@/components/medical-spa/workflows/medical-spa-workflows-tab';
import { OptometristWorkflowsTab } from '@/components/optometrist/workflows/optometrist-workflows-tab';
import { HealthClinicWorkflowsTab } from '@/components/health-clinic/workflows/health-clinic-workflows-tab';
import { HospitalWorkflowsTab } from '@/components/hospital/workflows/hospital-workflows-tab';
import { TechnologyWorkflowsTab } from '@/components/technology/workflows/technology-workflows-tab';
import { SportsClubWorkflowsTab } from '@/components/sports-club/workflows/sports-club-workflows-tab';
import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

/** Workflow tab component - either no props or industry prop for fallback */
export type WorkflowTabComponent =
  | ComponentType<Record<string, never>>
  | ComponentType<{ industry: Industry }>;

/** Registry: industry → workflow tab component */
export const WORKFLOW_TAB_REGISTRY: Partial<Record<Industry, WorkflowTabComponent>> = {
  REAL_ESTATE: REWorkflowsTab,
  MEDICAL: MedicalWorkflowsTab,
  RESTAURANT: RestaurantWorkflowsTab,
  CONSTRUCTION: ConstructionWorkflowsTab,
  DENTIST: DentistWorkflowsTab,
  MEDICAL_SPA: MedicalSpaWorkflowsTab,
  OPTOMETRIST: OptometristWorkflowsTab,
  HEALTH_CLINIC: HealthClinicWorkflowsTab,
  HOSPITAL: HospitalWorkflowsTab,
  TECHNOLOGY: TechnologyWorkflowsTab,
  SPORTS_CLUB: SportsClubWorkflowsTab,
};

/**
 * Get workflow tab component for industry.
 * Falls back to IndustryWorkflowsTab for unregistered industries (ACCOUNTING, LAW, ORTHODONTIST).
 */
export function getWorkflowTabForIndustry(industry: Industry | null): WorkflowTabComponent {
  if (!industry) return IndustryWorkflowsTab;
  return WORKFLOW_TAB_REGISTRY[industry] ?? IndustryWorkflowsTab;
}

/**
 * Check if component is the generic IndustryWorkflowsTab (needs industry prop).
 */
export function isIndustryFallbackTab(component: WorkflowTabComponent): boolean {
  return component === IndustryWorkflowsTab;
}
