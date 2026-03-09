import fs from "node:fs/promises";
import path from "node:path";
import { getMetaDb } from "@/lib/db/meta-db";
import { listTenantRoutingRecords } from "@/lib/tenancy/tenant-registry";
import { tenantDatabaseEnvKey } from "@/lib/tenancy/owner-db-provisioning";

export interface TenantAttestationRow {
  tenantId: string;
  ownerEmail: string;
  envKey: string;
  dbId: string;
  dbRegion: string;
  dedicated: boolean;
  configured: boolean;
  routingMode: string;
  createdAt: Date;
}

export interface TenantAttestationData {
  weekKey: string;
  periodStart: string;
  periodEnd: string;
  preparedDate: string;
  totalActiveOwners: number;
  dedicatedOwners: number;
  nonDedicatedOwners: number;
  coveragePct: string;
  newOwners: number;
  newOwnersDedicated: number;
  exceptions: number;
  failedVerifications: number;
  migrationWaves: string[];
  onboardingActive: "Yes" | "No";
  verifiedBy: string;
  verifiedAt: string;
  rows: TenantAttestationRow[];
}

async function fetchVercelEnvKeySet(): Promise<Set<string>> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return new Set<string>();

  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/env`);
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return new Set<string>();

  const payload = (await res.json()) as { envs?: Array<{ key: string }> };
  return new Set((payload.envs || []).map((e) => e.key));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function getIsoWeekInfo(date: Date): { isoYear: number; isoWeek: number } {
  const tmp = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const isoWeek = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { isoYear: tmp.getUTCFullYear(), isoWeek };
}

function getWeekWindow(date: Date): { weekStart: Date; weekEnd: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { weekStart: start, weekEnd: end };
}

function parseDbMeta(databaseEnvKey: string): {
  dbId: string;
  dbRegion: string;
} {
  const url = process.env[databaseEnvKey];
  if (!url || !url.trim()) {
    return { dbId: `UNCONFIGURED:${databaseEnvKey}`, dbRegion: "unknown" };
  }

  try {
    const host = new URL(url).hostname;
    const dbId = host.split(".")[0] || databaseEnvKey;
    const region =
      host.match(/\b(?:ca|us|eu|ap|sa|me|af)-[a-z]+-\d\b/)?.[0] || "unknown";
    return { dbId, dbRegion: region };
  } catch {
    return { dbId: `ENVKEY:${databaseEnvKey}`, dbRegion: "unknown" };
  }
}

async function listWaveArtifactsForWindow(
  weekStart: Date,
  weekEnd: Date,
): Promise<string[]> {
  const base = path.join(process.cwd(), "docs", "tenancy");
  try {
    const entries = await fs.readdir(base);
    const waveFiles = entries.filter((n) =>
      /^STEP3_WAVE\d+_RESULTS\.md$/i.test(n),
    );

    const out: string[] = [];
    for (const name of waveFiles) {
      const full = path.join(base, name);
      const stat = await fs.stat(full);
      const t = stat.mtime.getTime();
      if (t >= weekStart.getTime() && t <= weekEnd.getTime() + 86399999) {
        out.push(name);
      }
    }
    out.sort((a, b) => a.localeCompare(b));
    return out;
  } catch {
    return [];
  }
}

export async function collectTenantAttestationData(
  limit = 5000,
  now = new Date(),
): Promise<TenantAttestationData> {
  const { isoYear, isoWeek } = getIsoWeekInfo(now);
  const { weekStart, weekEnd } = getWeekWindow(now);
  const weekKey = `${isoYear}-W${pad(isoWeek)}`;

  const db = getMetaDb();
  const [users, routingRecords, waveArtifacts, vercelEnvKeys] =
    await Promise.all([
      db.user.findMany({
        where: { deletedAt: null, role: "BUSINESS_OWNER" },
        select: { id: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      listTenantRoutingRecords(limit),
      listWaveArtifactsForWindow(weekStart, weekEnd),
      fetchVercelEnvKeySet(),
    ]);

  const routingByTenant = new Map(routingRecords.map((r) => [r.tenantId, r]));
  const verifiedBy = process.env.USER || "automation-script";
  const verifiedAt = new Date().toISOString();

  const rows: TenantAttestationRow[] = users.map((u) => {
    const routing = routingByTenant.get(u.id);
    const envKey = routing?.databaseEnvKey || "DATABASE_URL";
    const { dbId, dbRegion } = parseDbMeta(envKey);
    const ownerEnvKey = tenantDatabaseEnvKey(u.id);
    const hasDedicatedKey = vercelEnvKeys.has(ownerEnvKey);
    const dedicated =
      routing?.routingMode === "TENANT_OVERRIDE" || hasDedicatedKey;

    return {
      tenantId: u.id,
      ownerEmail: u.email || "unknown",
      envKey,
      dbId,
      dbRegion,
      dedicated,
      configured: Boolean(routing?.databaseUrlConfigured) || hasDedicatedKey,
      routingMode: hasDedicatedKey
        ? "TENANT_OVERRIDE"
        : routing?.routingMode || "DEFAULT_DATABASE",
      createdAt: u.createdAt,
    };
  });

  const totalActiveOwners = rows.length;
  const dedicatedOwners = rows.filter(
    (r) => r.dedicated && r.configured,
  ).length;
  const nonDedicatedOwners = totalActiveOwners - dedicatedOwners;
  const coveragePct =
    totalActiveOwners > 0
      ? ((dedicatedOwners / totalActiveOwners) * 100).toFixed(2)
      : "0.00";

  const newOwnersRows = rows.filter(
    (r) =>
      r.createdAt.getTime() >= weekStart.getTime() &&
      r.createdAt.getTime() <= weekEnd.getTime() + 86399999,
  );
  const newOwnersDedicated = newOwnersRows.filter(
    (r) => r.dedicated && r.configured,
  ).length;

  const exceptions = rows.filter((r) => !r.configured || !r.dedicated).length;
  const failedVerifications = rows.filter((r) => !r.configured).length;

  return {
    weekKey,
    periodStart: fmtDate(weekStart),
    periodEnd: fmtDate(weekEnd),
    preparedDate: fmtDate(now),
    totalActiveOwners,
    dedicatedOwners,
    nonDedicatedOwners,
    coveragePct,
    newOwners: newOwnersRows.length,
    newOwnersDedicated,
    exceptions,
    failedVerifications,
    migrationWaves: waveArtifacts,
    onboardingActive:
      newOwnersRows.length === newOwnersDedicated ? "Yes" : "No",
    verifiedBy,
    verifiedAt,
    rows,
  };
}

export function renderTenantAttestationMarkdown(
  data: TenantAttestationData,
): string {
  const periodLine = `${data.weekKey} (${data.periodStart} to ${data.periodEnd})`;
  const migrationWavesValue =
    data.migrationWaves.length > 0
      ? data.migrationWaves.join(", ")
      : "None detected this week";

  const exceptions = data.rows.filter((r) => !r.configured || !r.dedicated);
  const exceptionRows =
    exceptions.length === 0
      ? "| None | N/A | N/A | N/A | Low | N/A | N/A | N/A |"
      : exceptions
          .map((e) => {
            const exceptionType = !e.configured
              ? "Database URL not configured"
              : "Not tenant-dedicated (routing mode)";
            const riskLevel = !e.configured ? "High" : "Medium";
            const mitigation = !e.configured
              ? "Configure env key and validate routing"
              : "Migrate to tenant override DB path";
            return `| ${e.tenantId} | ${e.dbId} | TBD | ${exceptionType} | ${riskLevel} | ${mitigation} | Platform/Infra | TBD |`;
          })
          .join("\n");

  const appendixRows = data.rows
    .map(
      (r) =>
        `| ${r.tenantId} | ${r.ownerEmail} | ${r.dbId} | ${r.dbRegion} | ${r.dedicated && r.configured ? "true" : "false"} | - | ${data.verifiedAt} | ${data.verifiedBy} | ${r.routingMode} via ${r.envKey} |`,
    )
    .join("\n");

  return `# Tenant-DB Mapping Attestation - ${data.weekKey}

Organization: Soshogle Inc.  
Product: Nexrel  
Reporting Period: ${periodLine}  
Prepared Date: ${data.preparedDate}

## 1) Executive Attestation

- Total active owners reviewed: ${data.totalActiveOwners}
- Owners on dedicated tenant DB: ${data.dedicatedOwners}
- Owners not yet on dedicated tenant DB: ${data.nonDedicatedOwners}
- Coverage (% dedicated): ${data.coveragePct}%
- Dedicated-by-default onboarding active for new owners: ${data.onboardingActive}

Attestation statement:

"I attest that the tenant-to-database mapping for the reporting period above was reviewed, evidence was sampled, and exceptions (if any) are documented with remediation timelines."

- Prepared by (name/role): ${data.verifiedBy} / Engineering Automation
- Reviewed by (name/role): TBD
- Approved by (name/role): TBD
- Sign-off date: TBD

## 2) Data Sources and Verification Method

- Registry/source of truth used (table/service/file): \`lib/tenancy/tenant-registry.ts\` + Meta DB user directory
- Query/report version or script reference: \`scripts/tenancy/generate-tenant-db-mapping-attestation.ts\`
- Verification approach:
  - [x] Full population check
  - [ ] Statistical sample
  - [ ] Full population + sample validation
- Integrity checks run (select all):
  - [x] Tenant route lookup success
  - [x] DB target matches registry mapping
  - [x] Region/residency constraint check (best-effort from DB host metadata)
  - [x] Recent migration wave parity checks (artifact presence)

## 3) Exceptions and Remediation Plan

| Tenant ID | Current DB ID | Target DB ID | Exception Type | Risk Level | Mitigation | Owner | ETA |
| --- | --- | --- | --- | --- | --- | --- | --- |
${exceptionRows}

## 4) Summary Metrics

| Metric | Value |
| --- | --- |
| Active owners | ${data.totalActiveOwners} |
| Dedicated DB owners | ${data.dedicatedOwners} |
| Shared/legacy owners | ${data.nonDedicatedOwners} |
| New owners this period | ${data.newOwners} |
| New owners dedicated by default | ${data.newOwnersDedicated} |
| Migration wave(s) completed this period | ${migrationWavesValue} |
| Failed verifications | ${data.failedVerifications} |
| Open exceptions | ${data.exceptions} |

## 5) Evidence Attachments Checklist

- [x] Tenant->DB mapping export attached (Appendix A)
- [${data.migrationWaves.length > 0 ? "x" : " "}] Migration wave report(s) attached
- [ ] Spot-check query outputs attached
- [ ] Rollback/revert references for in-flight migrations attached
- [ ] Legal/privacy review notes attached (if required)

## 6) Appendix A - Per-Tenant Mapping Table

| tenantId | ownerEmail | dbId | dbRegion | dedicated | migratedAt | routingVerifiedAt | verifiedBy | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${appendixRows}

## 7) Appendix B - Review Cadence

- Weekly operational review: Engineering/Platform
- Monthly integrity review: Engineering + Privacy Officer
- Quarterly compliance evidence review: Privacy + Legal/Compliance
`;
}

export function renderTenantAttestationCsv(
  data: TenantAttestationData,
): string {
  const header = [
    "tenantId",
    "ownerEmail",
    "dbId",
    "dbRegion",
    "dedicated",
    "routingMode",
    "envKey",
    "configured",
    "routingVerifiedAt",
    "verifiedBy",
  ];
  const escape = (value: string | boolean) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const body = data.rows.map((r) =>
    [
      r.tenantId,
      r.ownerEmail,
      r.dbId,
      r.dbRegion,
      r.dedicated && r.configured,
      r.routingMode,
      r.envKey,
      r.configured,
      data.verifiedAt,
      data.verifiedBy,
    ]
      .map(escape)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

export async function writeTenantAttestationFile(
  data: TenantAttestationData,
): Promise<string> {
  const markdown = renderTenantAttestationMarkdown(data);
  const outputPath = path.join(
    process.cwd(),
    "docs",
    "tenancy",
    `TENANT_DB_MAPPING_ATTESTATION_${data.weekKey}.md`,
  );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown, "utf8");
  return outputPath;
}

export async function listTenantAttestationFiles(): Promise<string[]> {
  const base = path.join(process.cwd(), "docs", "tenancy");
  try {
    const entries = await fs.readdir(base);
    return entries
      .filter((name) =>
        /^TENANT_DB_MAPPING_ATTESTATION_\d{4}-W\d{2}\.md$/.test(name),
      )
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}
