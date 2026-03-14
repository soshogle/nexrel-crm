import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  classifyBlocker,
  parseCommandEvidence,
} from "@/lib/ai-employees/reliability";

type Args = {
  sampleSize: number;
  minSuccessRate: number;
  strict: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const read = (name: string, fallback: string) => {
    const match = args.find((arg) => arg.startsWith(`--${name}=`));
    return match ? match.split("=").slice(1).join("=") : fallback;
  };

  return {
    sampleSize: Number(read("sample-size", "10")),
    minSuccessRate: Number(read("min-success", "0.95")),
    strict: read("strict", "false") === "true",
  };
}

function summarizeRun(run: any) {
  const output = (run.output || {}) as any;
  const steps = Array.isArray(output.steps) ? output.steps : [];
  const failedSteps = steps.filter((s: any) => s?.status === "failed");
  const completedSteps = steps.filter((s: any) => s?.status === "completed");

  const blockers: string[] = [];
  for (const step of failedSteps) {
    const result = String(step?.result || "");
    const evidence = parseCommandEvidence(result);
    const blocker = evidence?.blockerClass || classifyBlocker(result);
    blockers.push(String(blocker || "unknown"));
  }

  const completed =
    String(run.status || "") === "COMPLETED" ||
    String(output?.sessionState || "").toLowerCase() === "completed";

  return {
    id: run.id,
    createdAt: run.createdAt,
    workflowTier: String(output?.memory?.workflowTier || "unknown"),
    runtime: String(output?.memory?.executionRuntime || "unknown"),
    completed,
    completedSteps: completedSteps.length,
    failedSteps: failedSteps.length,
    blockers,
  };
}

async function main() {
  const args = parseArgs();
  if (!process.env.DATABASE_URL && process.env.RELIABILITY_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.RELIABILITY_DATABASE_URL;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for reliability:canary (or set RELIABILITY_DATABASE_URL)",
    );
  }

  const artifactsDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const dbUrl = String(process.env.DATABASE_URL || "");
  if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
    const report = {
      generatedAt: new Date().toISOString(),
      sampleSize: args.sampleSize,
      minSuccessRate: args.minSuccessRate,
      strict: args.strict,
      totalRuns: 0,
      passedRuns: 0,
      successRate: 0,
      topBlockers: [{ blocker: "invalid_database_url", count: 1 }],
      runs: [],
      pass: false,
      note: "RELIABILITY_DATABASE_URL must be a postgres:// or postgresql:// connection string",
    };
    fs.writeFileSync(
      path.join(artifactsDir, "reliability-canary-report.json"),
      JSON.stringify(report, null, 2),
    );
    fs.writeFileSync(
      path.join(artifactsDir, "reliability-canary-report.md"),
      "# Canary Report\n\n- Pass: false\n- Top Blocker: invalid_database_url\n",
    );
    throw new Error(report.note);
  }

  const prisma = new PrismaClient();
  const rows = await prisma.aIJob.findMany({
    where: {
      jobType: "live_browser_session",
      output: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, args.sampleSize),
    select: {
      id: true,
      status: true,
      createdAt: true,
      output: true,
    },
  });

  const runs = rows.map(summarizeRun);
  const passed = runs.filter((r) => r.completed).length;
  const successRate = runs.length > 0 ? passed / runs.length : 0;

  const blockerCounts: Record<string, number> = {};
  for (const run of runs) {
    for (const blocker of run.blockers) {
      blockerCounts[blocker] = (blockerCounts[blocker] || 0) + 1;
    }
  }

  const topBlockers = Object.entries(blockerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([blocker, count]) => ({ blocker, count }));

  const report = {
    generatedAt: new Date().toISOString(),
    sampleSize: args.sampleSize,
    minSuccessRate: args.minSuccessRate,
    strict: args.strict,
    totalRuns: runs.length,
    passedRuns: passed,
    successRate,
    topBlockers,
    runs,
    pass: runs.length === 0 ? !args.strict : successRate >= args.minSuccessRate,
  };

  fs.writeFileSync(
    path.join(artifactsDir, "reliability-canary-report.json"),
    JSON.stringify(report, null, 2),
  );

  const md = [
    "# Canary Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Runs: ${report.passedRuns}/${report.totalRuns}`,
    `Success Rate: ${(report.successRate * 100).toFixed(2)}%`,
    `Pass: ${String(report.pass)}`,
    "",
    "## Top Blockers",
    ...topBlockers.map((b) => `- ${b.blocker}: ${b.count}`),
  ].join("\n");
  fs.writeFileSync(
    path.join(artifactsDir, "reliability-canary-report.md"),
    `${md}\n`,
  );

  console.log(
    `Canary: ${report.passedRuns}/${report.totalRuns} (${(report.successRate * 100).toFixed(2)}%)`,
  );

  if (!report.pass) {
    throw new Error(
      `Canary failed: successRate ${(report.successRate * 100).toFixed(2)}% below ${(args.minSuccessRate * 100).toFixed(2)}%`,
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
