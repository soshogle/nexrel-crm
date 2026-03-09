import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import {
  collectTenantAttestationData,
  listTenantAttestationFiles,
  renderTenantAttestationCsv,
  renderTenantAttestationMarkdown,
  writeTenantAttestationFile,
} from "@/lib/tenancy/attestation-report";
import { listTenantRoutingCoverage } from "@/lib/tenancy/tenant-registry";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { ok: false as const, response: apiErrors.unauthorized() };

  const user = await getMetaDb().user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "SUPER_ADMIN") {
    return {
      ok: false as const,
      response: apiErrors.forbidden("Forbidden: SUPER_ADMIN access required"),
    };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const download = searchParams.get("download") === "1";
    const limit = Number(searchParams.get("limit") || "5000");

    if (download && format) {
      const data = await collectTenantAttestationData(limit);
      const filenameBase = `TENANT_DB_MAPPING_ATTESTATION_${data.weekKey}`;

      if (format === "md") {
        return new NextResponse(renderTenantAttestationMarkdown(data), {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filenameBase}.md"`,
          },
        });
      }

      if (format === "csv") {
        return new NextResponse(renderTenantAttestationCsv(data), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
          },
        });
      }

      if (format === "json") {
        return new NextResponse(JSON.stringify(data, null, 2), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
          },
        });
      }

      return apiErrors.badRequest("Invalid format. Use md, csv, or json.");
    }

    const [files, current, coverage] = await Promise.all([
      listTenantAttestationFiles(),
      collectTenantAttestationData(limit),
      listTenantRoutingCoverage(limit),
    ]);

    const env = {
      NEON_API_KEY: Boolean(process.env.NEON_API_KEY),
      VERCEL_TOKEN: Boolean(process.env.VERCEL_TOKEN),
      VERCEL_PROJECT_ID: Boolean(process.env.VERCEL_PROJECT_ID),
      VERCEL_TEAM_ID: Boolean(process.env.VERCEL_TEAM_ID),
      TENANCY_REQUIRE_OWNER_OVERRIDE:
        process.env.TENANCY_REQUIRE_OWNER_OVERRIDE === "true",
    };

    return NextResponse.json({
      current,
      files,
      latestFile: files[0] ?? null,
      provisioningHealth: {
        env,
        routingCoverage: coverage,
      },
    });
  } catch (error: any) {
    console.error("Error in tenancy attestation GET:", error);
    return apiErrors.internal(error?.message || "Failed to load attestation");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const limit = Number(body?.limit || 5000);

    const data = await collectTenantAttestationData(limit);
    const outputPath = await writeTenantAttestationFile(data);

    return NextResponse.json({
      success: true,
      outputPath,
      weekKey: data.weekKey,
      summary: {
        totalActiveOwners: data.totalActiveOwners,
        dedicatedOwners: data.dedicatedOwners,
        nonDedicatedOwners: data.nonDedicatedOwners,
        coveragePct: data.coveragePct,
        exceptions: data.exceptions,
      },
    });
  } catch (error: any) {
    console.error("Error in tenancy attestation POST:", error);
    return apiErrors.internal(
      error?.message || "Failed to generate attestation",
    );
  }
}
