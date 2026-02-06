/**
 * Health Clinic Industry Workflows Tab
 * Wrapper for Health Clinic-specific workflows
 */

'use client';

import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';

export function HealthClinicWorkflowsTab() {
  return <IndustryWorkflowsTab industry="HEALTH_CLINIC" />;
}
