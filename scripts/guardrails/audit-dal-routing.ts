#!/usr/bin/env tsx

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app/api", "lib"];
const EXCLUDE_DIRS = [
  "lib/dal",
  "lib/db",
  "lib/context",
  "scripts",
  "node_modules",
  ".next",
  "owner-websites",
];

const FILE_EXT = new Set([".ts", ".tsx"]);

type Violation = {
  file: string;
  reason: string;
};

type AuditSummary = {
  totalFilesScanned: number;
  totalViolations: number;
  byReason: Record<string, number>;
  violations: Violation[];
};

function isExcluded(relPath: string): boolean {
  return EXCLUDE_DIRS.some(
    (prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`),
  );
}

function walk(dirAbs: string, out: string[] = []): string[] {
  if (!fs.existsSync(dirAbs)) return out;
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });

  for (const entry of entries) {
    const abs = path.join(dirAbs, entry.name);
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");

    if (isExcluded(rel)) continue;

    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!FILE_EXT.has(ext)) continue;
    out.push(abs);
  }

  return out;
}

function scanFile(fileAbs: string): Violation[] {
  const text = fs.readFileSync(fileAbs, "utf8");
  const rel = path.relative(ROOT, fileAbs).replace(/\\/g, "/");
  const violations: Violation[] = [];

  const importsMainDb =
    /from\s+["']@\/lib\/db["']/.test(text) ||
    /from\s+["']\.\.\/.*\/lib\/db["']/.test(text);
  const usesPrisma = /\bprisma\.[a-zA-Z]/.test(text);
  const usesDal = /\bgetCrmDb\s*\(/.test(text);

  if (importsMainDb && usesPrisma) {
    violations.push({
      file: rel,
      reason:
        "Direct prisma usage detected; use resolveDalContext + getCrmDb for tenant data",
    });
  }

  if (/resolveDalContext\s*\(/.test(text) && !usesDal) {
    violations.push({
      file: rel,
      reason: "resolveDalContext used without getCrmDb call",
    });
  }

  return violations;
}

function main() {
  const strict = process.argv.includes("--strict");
  const json = process.argv.includes("--json");
  const maxArg = process.argv.find((a) => a.startsWith("--max-violations="));
  const maxViolations = maxArg ? Number(maxArg.split("=")[1]) : null;
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));

  const violations = files.flatMap((file) => scanFile(file));
  const byReason: Record<string, number> = {};
  for (const v of violations) {
    byReason[v.reason] = (byReason[v.reason] || 0) + 1;
  }

  const summary: AuditSummary = {
    totalFilesScanned: files.length,
    totalViolations: violations.length,
    byReason,
    violations,
  };

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  }

  if (!json && violations.length === 0) {
    console.log(
      "✅ DAL routing audit passed: no direct-prisma violations found.",
    );
    return;
  }

  if (!json) {
    console.log(
      `⚠️ DAL routing audit found ${violations.length} potential issue(s):\n`,
    );
    for (const v of violations) {
      console.log(`- ${v.file}`);
      console.log(`  ${v.reason}`);
    }
  }

  if (maxViolations !== null && violations.length > maxViolations) {
    console.error(
      `❌ DAL routing audit exceeded max violations (${violations.length} > ${maxViolations})`,
    );
    process.exit(1);
  }

  if (strict) {
    process.exit(1);
  }
}

main();
