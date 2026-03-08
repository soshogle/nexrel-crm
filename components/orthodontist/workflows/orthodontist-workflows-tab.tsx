/**
 * Orthodontist Industry Workflows Tab
 */

"use client";

import { IndustryWorkflowsTab } from "@/components/workflows/industry-workflows-tab";

export function OrthodontistWorkflowsTab({
  preSelectedAgent,
}: {
  preSelectedAgent?: string | null;
}) {
  return (
    <IndustryWorkflowsTab
      industry="ORTHODONTIST"
      preSelectedAgent={preSelectedAgent}
    />
  );
}
