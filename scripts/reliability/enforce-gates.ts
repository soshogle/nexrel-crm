import fs from "fs";
import path from "path";

function readJson(file: string) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const artifactsDir = path.join(process.cwd(), "artifacts");
  const kpis = readJson(
    path.join(artifactsDir, "reliability-live-run-kpis.json"),
  );
  const trend = readJson(
    path.join(artifactsDir, "reliability-trend-regression.json"),
  );
  const canary = readJson(
    path.join(artifactsDir, "reliability-canary-report.json"),
  );

  const failures: string[] = [];

  if (kpis && kpis.pass === false) {
    failures.push(
      `KPI gate failed: successRate=${kpis.successRate}, target=${kpis.targetSuccessRate}`,
    );
  }
  if (trend && trend.pass === false) {
    failures.push(
      `Trend gate failed: drop=${trend.drop}, maxDrop=${trend.maxDrop}`,
    );
  }
  if (canary && canary.pass === false) {
    failures.push(
      `Canary gate failed: successRate=${canary.successRate}, min=${canary.minSuccessRate}`,
    );
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    throw new Error("One or more reliability gates failed");
  }

  console.log("Reliability gate enforcement passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
