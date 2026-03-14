import {
  buildTierExecutionProfile,
  buildRecoveryPlan,
  classifyBlocker,
  classifyWorkflowTier,
  meetsReliabilityGate,
  shouldEscalateToHuman,
} from "@/lib/ai-employees/reliability";

type BenchmarkCase = {
  id: string;
  goal: string;
  targetApps: string[];
  expectedTier: "tier_1" | "tier_2" | "tier_3";
};

const workflowCases: BenchmarkCase[] = [
  {
    id: "calendar_appointment",
    goal: "Open calendar and create an appointment with Alex tomorrow at 3pm",
    targetApps: ["Calendar"],
    expectedTier: "tier_1",
  },
  {
    id: "gmail_followup",
    goal: "Draft a follow up email to a lead in Gmail",
    targetApps: ["Gmail"],
    expectedTier: "tier_1",
  },
  {
    id: "notion_roadmap",
    goal: "Update the project roadmap in Notion",
    targetApps: ["Notion"],
    expectedTier: "tier_2",
  },
  {
    id: "unknown_desktop_tool",
    goal: "Use Desktop Studio Pro to process this dataset",
    targetApps: ["Desktop Studio Pro"],
    expectedTier: "tier_3",
  },
];

const blockerCases: Array<{
  id: string;
  detail: string;
  expected: ReturnType<typeof classifyBlocker>;
  escalate: boolean;
}> = [
  {
    id: "captcha",
    detail: "captcha challenge detected at https://example.com",
    expected: "captcha",
    escalate: true,
  },
  {
    id: "two_factor",
    detail: "2FA verification required at https://secure.example.com",
    expected: "two_factor",
    escalate: true,
  },
  {
    id: "invalid_url",
    detail: "Protocol error (Page.navigate): Cannot navigate to invalid URL",
    expected: "invalid_url",
    escalate: false,
  },
  {
    id: "permission_denied",
    detail: "Operation not permitted while writing file",
    expected: "permission_denied",
    escalate: true,
  },
];

const recoveryCases: Array<{
  id: string;
  blocker: ReturnType<typeof classifyBlocker>;
  tier: "tier_1" | "tier_2" | "tier_3";
  strategy: "retry" | "replan" | "escalate";
}> = [
  {
    id: "selector_drift_t1",
    blocker: "selector_drift",
    tier: "tier_1",
    strategy: "retry",
  },
  {
    id: "invalid_url_t2",
    blocker: "invalid_url",
    tier: "tier_2",
    strategy: "replan",
  },
  {
    id: "captcha_t1",
    blocker: "captcha",
    tier: "tier_1",
    strategy: "escalate",
  },
];

let failures = 0;

for (const test of workflowCases) {
  const actual = classifyWorkflowTier({
    goal: test.goal,
    targetApps: test.targetApps,
  });
  if (actual !== test.expectedTier) {
    failures += 1;
    console.error(
      `[workflow:${test.id}] expected ${test.expectedTier}, got ${actual}`,
    );
  }
}

for (const test of blockerCases) {
  const actual = classifyBlocker(test.detail);
  const escalate = shouldEscalateToHuman(actual);
  if (actual !== test.expected || escalate !== test.escalate) {
    failures += 1;
    console.error(
      `[blocker:${test.id}] expected (${test.expected}, escalate=${test.escalate}), got (${actual}, escalate=${escalate})`,
    );
  }
}

for (const test of recoveryCases) {
  const plan = buildRecoveryPlan(test.blocker, test.tier);
  if (plan.strategy !== test.strategy) {
    failures += 1;
    console.error(
      `[recovery:${test.id}] expected strategy ${test.strategy}, got ${plan.strategy}`,
    );
  }
}

const reliabilityGatePassed = meetsReliabilityGate({
  successRate: 0.96,
  silentCompletionRate: 0,
  deterministicBlockerCoverage: 0.99,
  unknownEscalationSafetyRate: 1,
});
if (!reliabilityGatePassed) {
  failures += 1;
  console.error("[gate] expected reliability gate to pass but it failed");
}

const reliabilityGateRejected = meetsReliabilityGate({
  successRate: 0.93,
  silentCompletionRate: 0.01,
  deterministicBlockerCoverage: 0.95,
  unknownEscalationSafetyRate: 0.97,
});
if (reliabilityGateRejected) {
  failures += 1;
  console.error("[gate] expected low metrics to fail but gate passed");
}

const tierProfile = buildTierExecutionProfile("tier_1", 0.96);
if (tierProfile.verifyDepth !== "deep" || tierProfile.retryBudget < 3) {
  failures += 1;
  console.error(
    `[profile] tier_1 expected deep verification and >=3 retries, got ${JSON.stringify(tierProfile)}`,
  );
}

if (failures > 0) {
  console.error(`Reliability benchmark failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("Reliability benchmark passed.");
