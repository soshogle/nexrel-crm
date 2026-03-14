import fs from "fs";
import path from "path";

function readJson(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function pct(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(2)}%`;
}

async function main() {
  const artifactsDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });

  const acceptance = readJson(
    path.join(artifactsDir, "reliability-acceptance-matrix.json"),
  );
  const kpis = readJson(
    path.join(artifactsDir, "reliability-live-run-kpis.json"),
  );

  const lines: string[] = [];
  lines.push("# Reliability Summary");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Acceptance Matrix");
  if (!acceptance) {
    lines.push("- No acceptance matrix artifact found.");
  } else {
    lines.push(`- Total: ${acceptance.total}`);
    lines.push(`- Passed: ${acceptance.passed}`);
    lines.push(`- Failed: ${acceptance.failed}`);
    lines.push(`- Gate Passed: ${String(acceptance.gatePassed ?? "n/a")}`);
    if (acceptance.kpis) {
      lines.push(
        `- Overall Pass Rate: ${pct(acceptance.kpis.overallPassRate)}`,
      );
      lines.push(
        `- Tier 1 Pass Rate: ${pct(acceptance.kpis.tierPassRates?.tier_1)}`,
      );
      lines.push(
        `- Tier 2 Pass Rate: ${pct(acceptance.kpis.tierPassRates?.tier_2)}`,
      );
      lines.push(
        `- Tier 3 Pass Rate: ${pct(acceptance.kpis.tierPassRates?.tier_3)}`,
      );
    }
  }
  lines.push("");

  lines.push("## Live-Run KPI Gate");
  if (!kpis) {
    lines.push("- No live-run KPI artifact found.");
  } else {
    lines.push(`- Window Days: ${kpis.windowDays}`);
    lines.push(`- In-Scope Runs: ${kpis.inScopeRuns}`);
    lines.push(`- Successful Runs: ${kpis.successfulRuns}`);
    lines.push(`- Success Rate: ${pct(kpis.successRate)}`);
    lines.push(`- Target: ${pct(kpis.targetSuccessRate)}`);
    lines.push(`- Pass: ${String(kpis.pass)}`);
    if (kpis.notes) lines.push(`- Notes: ${kpis.notes}`);
  }

  const outputFile = path.join(artifactsDir, "reliability-summary.md");
  fs.writeFileSync(outputFile, lines.join("\n") + "\n");
  console.log(`Reliability summary written to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
