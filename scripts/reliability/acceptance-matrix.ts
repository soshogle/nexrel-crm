import fs from "fs";
import path from "path";
import {
  classifyWorkflowTier,
  meetsReliabilityGate,
} from "@/lib/ai-employees/reliability";

type Scenario = {
  id: string;
  objective: string;
  apps: string[];
  expectedTier: "tier_1" | "tier_2" | "tier_3";
};

const scenarios: Scenario[] = [
  {
    id: "t1_calendar_appointment",
    objective: "Create an appointment in Calendar for tomorrow at 3pm",
    apps: ["Calendar"],
    expectedTier: "tier_1",
  },
  {
    id: "t1_gmail_followup",
    objective: "Draft a follow-up email in Gmail to the top lead",
    apps: ["Gmail"],
    expectedTier: "tier_1",
  },
  {
    id: "t2_notion_update",
    objective: "Update the sprint page in Notion with this week's blockers",
    apps: ["Notion"],
    expectedTier: "tier_2",
  },
  {
    id: "t2_drive_upload",
    objective: "Upload the weekly report file to Google Drive folder",
    apps: ["Google Drive"],
    expectedTier: "tier_2",
  },
  {
    id: "t2_slack_summary",
    objective: "Post a weekly delivery summary in Slack channel #ops",
    apps: ["Slack"],
    expectedTier: "tier_2",
  },
  {
    id: "t2_asana_sync",
    objective: "Update Asana task statuses for sprint board",
    apps: ["Asana"],
    expectedTier: "tier_2",
  },
  {
    id: "t2_dropbox_archive",
    objective: "Move signed contracts to Dropbox archive folder",
    apps: ["Dropbox"],
    expectedTier: "tier_2",
  },
  {
    id: "t3_long_tail",
    objective:
      "Use Desktop Studio Pro to process the dataset and export a summary",
    apps: ["Desktop Studio Pro"],
    expectedTier: "tier_3",
  },
  {
    id: "t3_legacy_erp",
    objective: "Use LegacyERP Client to reconcile invoice batches",
    apps: ["LegacyERP Client"],
    expectedTier: "tier_3",
  },
  {
    id: "t3_bespoke_qa_tool",
    objective: "Run regression pass in Bespoke QA Workbench and export log",
    apps: ["Bespoke QA Workbench"],
    expectedTier: "tier_3",
  },
  {
    id: "t3_vertical_desktop_suite",
    objective: "Generate utilization report from VerticalOps desktop suite",
    apps: ["VerticalOps Desktop Suite"],
    expectedTier: "tier_3",
  },
];

const results = scenarios.map((scenario) => {
  const actualTier = classifyWorkflowTier({
    goal: scenario.objective,
    targetApps: scenario.apps,
  });
  return {
    ...scenario,
    actualTier,
    pass: actualTier === scenario.expectedTier,
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).length,
  results,
};

const byTier = {
  tier_1: results.filter((r) => r.expectedTier === "tier_1"),
  tier_2: results.filter((r) => r.expectedTier === "tier_2"),
  tier_3: results.filter((r) => r.expectedTier === "tier_3"),
};

const tierPassRates = {
  tier_1:
    byTier.tier_1.filter((r) => r.pass).length /
    Math.max(byTier.tier_1.length, 1),
  tier_2:
    byTier.tier_2.filter((r) => r.pass).length /
    Math.max(byTier.tier_2.length, 1),
  tier_3:
    byTier.tier_3.filter((r) => r.pass).length /
    Math.max(byTier.tier_3.length, 1),
};

const overallPassRate = output.passed / Math.max(output.total, 1);
const minTierPassRate = Math.min(
  tierPassRates.tier_1,
  tierPassRates.tier_2,
  tierPassRates.tier_3,
);

const kpis = {
  overallPassRate,
  tierPassRates,
  minTierPassRate,
};

const gatePassed = meetsReliabilityGate({
  successRate: overallPassRate,
  silentCompletionRate: 0,
  deterministicBlockerCoverage: minTierPassRate,
  unknownEscalationSafetyRate: 1,
});

const enrichedOutput = {
  ...output,
  kpis,
  gatePassed,
};

const outputDir = path.join(process.cwd(), "artifacts");
fs.mkdirSync(outputDir, { recursive: true });
const outputFile = path.join(outputDir, "reliability-acceptance-matrix.json");
fs.writeFileSync(outputFile, JSON.stringify(enrichedOutput, null, 2));

if (output.failed > 0 || !gatePassed) {
  console.error(
    `Acceptance matrix failed: ${output.failed}/${output.total} scenarios, gatePassed=${gatePassed}`,
  );
  process.exit(1);
}

console.log(
  `Acceptance matrix passed: ${output.passed}/${output.total} scenarios -> ${outputFile}`,
);
