import fs from "fs";
import path from "path";
import { classifyWorkflowTier } from "@/lib/ai-employees/reliability";

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
    id: "t3_long_tail",
    objective:
      "Use Desktop Studio Pro to process the dataset and export a summary",
    apps: ["Desktop Studio Pro"],
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

const outputDir = path.join(process.cwd(), "artifacts");
fs.mkdirSync(outputDir, { recursive: true });
const outputFile = path.join(outputDir, "reliability-acceptance-matrix.json");
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

if (output.failed > 0) {
  console.error(
    `Acceptance matrix failed: ${output.failed}/${output.total} scenarios`,
  );
  process.exit(1);
}

console.log(
  `Acceptance matrix passed: ${output.passed}/${output.total} scenarios -> ${outputFile}`,
);
