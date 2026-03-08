/**
 * Accounting Industry Workflows Tab
 */

"use client";

import { IndustryWorkflowsTab } from "@/components/workflows/industry-workflows-tab";

export function AccountingWorkflowsTab({
  preSelectedAgent,
}: {
  preSelectedAgent?: string | null;
}) {
  return (
    <IndustryWorkflowsTab
      industry="ACCOUNTING"
      preSelectedAgent={preSelectedAgent}
    />
  );
}
