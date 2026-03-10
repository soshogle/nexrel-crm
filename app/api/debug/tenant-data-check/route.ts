import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const sessionCtx = getDalContextFromSession(session);
    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = sessionCtx ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const effectiveIndustry =
      ctx.industry ?? resolvedCtx?.industry ?? session.user.industry ?? null;
    const industryEnvKey = effectiveIndustry
      ? `DATABASE_URL_${effectiveIndustry}`
      : null;

    const checks: Array<{ label: string; databaseEnvKey: string | null }> = [
      { label: "activeCtx", databaseEnvKey: ctx.databaseEnvKey ?? null },
    ];
    if (
      industryEnvKey &&
      process.env[industryEnvKey] &&
      industryEnvKey !== ctx.databaseEnvKey
    ) {
      checks.push({ label: "industryCtx", databaseEnvKey: industryEnvKey });
    }

    const results: Array<Record<string, unknown>> = [];
    for (const check of checks) {
      try {
        const db = getCrmDb({ ...ctx, databaseEnvKey: check.databaseEnvKey });
        const listingCount = await db.rEProperty.count({
          where: { userId: session.user.id },
        });
        const xrayCount = await db.dentalXRay.count({
          where: { userId: session.user.id },
        });
        const leadXrayCount = leadId
          ? await db.dentalXRay.count({
              where: { userId: session.user.id, leadId },
            })
          : null;

        results.push({
          label: check.label,
          databaseEnvKey: check.databaseEnvKey,
          listingCount,
          xrayCount,
          leadId,
          leadXrayCount,
        });
      } catch (error) {
        results.push({
          label: check.label,
          databaseEnvKey: check.databaseEnvKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        role: session.user.role,
        industry: session.user.industry,
        databaseEnvKey: session.user.databaseEnvKey,
      },
      effectiveIndustry,
      industryEnvKey,
      industryEnvConfigured: industryEnvKey
        ? Boolean(process.env[industryEnvKey])
        : false,
      sessionCtx: sessionCtx
        ? {
            userId: sessionCtx.userId,
            industry: sessionCtx.industry,
            databaseEnvKey: sessionCtx.databaseEnvKey,
          }
        : null,
      resolvedCtx: resolvedCtx
        ? {
            userId: resolvedCtx.userId,
            industry: resolvedCtx.industry,
            databaseEnvKey: resolvedCtx.databaseEnvKey,
          }
        : null,
      checks: results,
    });
  } catch (error) {
    return apiErrors.internal(
      error instanceof Error ? error.message : "Failed tenant data check",
    );
  }
}
