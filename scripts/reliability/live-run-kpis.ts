import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

type Args = {
  days: number;
  target: number;
  minSamples: number;
  strict: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const read = (name: string, fallback: string) => {
    const match = args.find((arg) => arg.startsWith(`--${name}=`));
    return match ? match.split("=").slice(1).join("=") : fallback;
  };

  return {
    days: Number(read("days", "7")),
    target: Number(read("target", "0.95")),
    minSamples: Number(read("min-samples", "10")),
    strict: read("strict", "false") === "true",
  };
}

function hasOutcomeEvidence(output: any): boolean {
  const steps = Array.isArray(output?.steps) ? output.steps : [];
  const completed = steps.filter((step: any) => step?.status === "completed");
  if (completed.length === 0) return false;
  return completed.every((step: any) => {
    const text = String(step?.result || "").trim();
    if (!text) return false;
    if (!text.startsWith("{")) return true;
    try {
      const parsed = JSON.parse(text);
      return String(parsed?.status || "").toLowerCase() === "completed";
    } catch {
      return true;
    }
  });
}

async function main() {
  const args = parseArgs();
  if (!process.env.DATABASE_URL && process.env.RELIABILITY_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.RELIABILITY_DATABASE_URL;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for reliability:kpis (or set RELIABILITY_DATABASE_URL)",
    );
  }

  const prisma = new PrismaClient();

  const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
  const runs = await prisma.aIJob.findMany({
    where: {
      jobType: "live_browser_session",
      createdAt: { gte: since },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      input: true,
      output: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const inScope = runs.filter((run) => {
    const output = (run.output || {}) as any;
    const tier = String(output?.memory?.workflowTier || "");
    return tier === "tier_1" || tier === "tier_2";
  });

  const successful = inScope.filter((run) => {
    const output = (run.output || {}) as any;
    const completed =
      String(run.status || "") === "COMPLETED" ||
      String(output?.sessionState || "").toLowerCase() === "completed";
    return completed && hasOutcomeEvidence(output);
  });

  const failures = inScope.filter(
    (run) => !successful.some((s) => s.id === run.id),
  );

  const successRate =
    inScope.length === 0 ? 0 : successful.length / Math.max(inScope.length, 1);

  const result = {
    generatedAt: new Date().toISOString(),
    windowDays: args.days,
    targetSuccessRate: args.target,
    minSamples: args.minSamples,
    inScopeRuns: inScope.length,
    successfulRuns: successful.length,
    failedRuns: failures.length,
    successRate,
    pass:
      inScope.length >= args.minSamples
        ? successRate >= args.target
        : !args.strict,
    notes:
      inScope.length < args.minSamples
        ? `Insufficient samples (${inScope.length}/${args.minSamples})`
        : undefined,
    failedRunIds: failures.slice(0, 50).map((run) => run.id),
  };

  const outputDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, "reliability-live-run-kpis.json");
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

  console.log(
    `Live-run KPI: ${result.successfulRuns}/${result.inScopeRuns} (${(successRate * 100).toFixed(2)}%)`,
  );
  console.log(`Report written to ${outputFile}`);

  if (!result.pass) {
    throw new Error(
      `Reliability KPI gate failed. successRate=${successRate.toFixed(4)}, target=${args.target}, samples=${inScope.length}`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
