import { describe, expect, it } from "vitest";
import {
  correlateWithBaseline,
  evaluateGovernanceAlerts,
  type AIBrainOperationalMetrics,
  type CrmOutcomeMetrics,
} from "@/lib/nexrel-ai-brain/governance-analytics";

const currentOperational: AIBrainOperationalMetrics = {
  operatorRuns: 40,
  operatorChatRuns: 15,
  shadowRuns: 28,
  deniedActions: 12,
  pendingApprovals: 6,
  completedApprovals: 14,
  approvalSlaAvgHours: 8,
};

const currentCrm: CrmOutcomeMetrics = {
  leadsCreated: 50,
  contactedLeads: 30,
  qualifiedLeads: 18,
  convertedLeads: 10,
  conversionRatePct: 20,
  tasksCreated: 40,
  tasksCompleted: 32,
  taskCompletionRatePct: 80,
};

describe("nexrel ai brain governance analytics", () => {
  it("computes positive KPI deltas against baseline", () => {
    const correlation = correlateWithBaseline(
      { aiBrain: currentOperational, crm: currentCrm },
      {
        baselineId: "baseline-1",
        createdAt: new Date().toISOString(),
        windowDays: 30,
        aiBrain: {
          ...currentOperational,
          operatorRuns: 25,
          deniedActions: 10,
          pendingApprovals: 4,
          approvalSlaAvgHours: 10,
        },
        crm: {
          ...currentCrm,
          leadsCreated: 45,
          convertedLeads: 8,
          conversionRatePct: 17,
          taskCompletionRatePct: 74,
        },
      },
    );

    expect(correlation.aiBrain.operatorRunsDelta).toBe(15);
    expect(correlation.aiBrain.approvalSlaAvgHoursDelta).toBe(-2);
    expect(correlation.crm.conversionRatePctDelta).toBe(3);
  });

  it("returns alerts when thresholds are breached", () => {
    const alerts = evaluateGovernanceAlerts({
      operational: {
        ...currentOperational,
        deniedActions: 40,
        pendingApprovals: 18,
        approvalSlaAvgHours: 30,
      },
      correlation: {
        aiBrain: {
          operatorRunsDelta: 2,
          deniedActionsDelta: 25,
          pendingApprovalsDelta: 12,
          approvalSlaAvgHoursDelta: 9,
        },
        crm: {
          leadsCreatedDelta: -4,
          convertedLeadsDelta: -3,
          conversionRatePctDelta: -6,
          taskCompletionRatePctDelta: -2,
        },
      },
      thresholds: {
        maxApprovalSlaHours: 24,
        maxPendingApprovals: 10,
        maxDeniedActions: 25,
        maxConversionDropPct: 5,
      },
    });

    expect(alerts.map((a) => a.code)).toEqual([
      "APPROVAL_SLA_BREACH",
      "PENDING_APPROVAL_BACKLOG",
      "DENIED_ACTION_SPIKE",
      "CONVERSION_DROP",
    ]);
  });
});
