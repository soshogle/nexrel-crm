import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { resolveReliabilityDbUrl } from "./db-url";

type Args = {
  windowDays: number;
  maxDrop: number;
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
    windowDays: Number(read("window-days", "7")),
    maxDrop: Number(read("max-drop", "0.03")),
    minSamples: Number(read("min-samples", "10")),
    strict: read("strict", "true") === "true",
  };
}

function hasOutcomeEvidence(output: any): boolean {
  const steps = Array.isArray(output?.steps) ? output.steps : [];
  const completed = steps.filter((step: any) => step?.status === "completed");
  if (completed.length === 0) return false;

  return completed.every((step: any) => {
    const result = String(step?.result || "").trim();
    if (!result) return false;
    if (!result.startsWith("{")) return true;
    try {
      const parsed = JSON.parse(result);
      return String(parsed?.status || "").toLowerCase() === "completed";
    } catch {
      return true;
    }
  });
}

function calcInScopeRate(runs: Array<{ status: string; output: any }>) {
  const inScope = runs.filter((run) => {
    const tier = String(run?.output?.memory?.workflowTier || "");
    return tier === "tier_1" || tier === "tier_2";
  });

  const successful = inScope.filter((run) => {
    const output = run.output || {};
    const completed =
      String(run.status || "") === "COMPLETED" ||
      String(output?.sessionState || "").toLowerCase() === "completed";
    return completed && hasOutcomeEvidence(output);
  });

  return {
    total: inScope.length,
    successful: successful.length,
    successRate: inScope.length > 0 ? successful.length / inScope.length : 0,
  };
}

async function main() {
  const args = parseArgs();
  if (!process.env.DATABASE_URL && process.env.RELIABILITY_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.RELIABILITY_DATABASE_URL;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for reliability:trend (or set RELIABILITY_DATABASE_URL)",
    );
  }

  const outputDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(outputDir, { recursive: true });
  const dbUrl = resolveReliabilityDbUrl(process.env.DATABASE_URL);
  if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
    const result = {
      generatedAt: new Date().toISOString(),
      windowDays: args.windowDays,
      maxDrop: args.maxDrop,
      minSamples: args.minSamples,
      strict: args.strict,
      current: { total: 0, successful: 0, successRate: 0 },
      previous: { total: 0, successful: 0, successRate: 0 },
      drop: 0,
      pass: false,
      note: "RELIABILITY_DATABASE_URL must be a postgres:// or postgresql:// connection string",
    };
    fs.writeFileSync(
      path.join(outputDir, "reliability-trend-regression.json"),
      JSON.stringify(result, null, 2),
    );
    throw new Error(result.note);
  }
  process.env.DATABASE_URL = dbUrl;

  const prisma = new PrismaClient();

  const now = Date.now();
  const currentStart = new Date(now - args.windowDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(
    now - args.windowDays * 2 * 24 * 60 * 60 * 1000,
  );

  const recent = await prisma.aIJob.findMany({
    where: {
      jobType: "live_browser_session",
      createdAt: { gte: previousStart },
    },
    select: {
      status: true,
      createdAt: true,
      output: true,
    },
    take: 2000,
    orderBy: { createdAt: "desc" },
  });

  const currentWindow = recent.filter((run) => run.createdAt >= currentStart);
  const previousWindow = recent.filter(
    (run) => run.createdAt >= previousStart && run.createdAt < currentStart,
  );

  const current = calcInScopeRate(currentWindow as any);
  const previous = calcInScopeRate(previousWindow as any);
  const drop = previous.successRate - current.successRate;

  const enoughSamples =
    current.total >= args.minSamples && previous.total >= args.minSamples;
  const pass = enoughSamples ? drop <= args.maxDrop : !args.strict;

  const result = {
    generatedAt: new Date().toISOString(),
    windowDays: args.windowDays,
    maxDrop: args.maxDrop,
    minSamples: args.minSamples,
    strict: args.strict,
    current,
    previous,
    drop,
    pass,
    note: enoughSamples
      ? undefined
      : `Insufficient samples current=${current.total}, previous=${previous.total}`,
  };

  const outputFile = path.join(outputDir, "reliability-trend-regression.json");
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

  console.log(
    `Trend regression: current=${(current.successRate * 100).toFixed(2)}% previous=${(previous.successRate * 100).toFixed(2)}% drop=${(drop * 100).toFixed(2)}%`,
  );
  console.log(`Report written to ${outputFile}`);

  if (!pass) {
    throw new Error(
      `Trend regression gate failed. drop=${drop.toFixed(4)} maxDrop=${args.maxDrop}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
