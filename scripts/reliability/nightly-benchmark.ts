import {
  classifyBlocker,
  classifyWorkflowTier,
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

if (failures > 0) {
  console.error(`Reliability benchmark failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("Reliability benchmark passed.");
