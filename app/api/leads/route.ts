export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { leadService } from "@/lib/dal";
import { getCrmDb } from "@/lib/dal/db";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { detectLeadWorkflowTriggers } from "@/lib/real-estate/workflow-triggers";
import { apiErrors } from "@/lib/api-error";
import {
  LeadCreateBodySchema,
  LeadsGetQuerySchema,
} from "@/lib/api-validation";
import { emitCRMEvent } from "@/lib/crm-event-emitter";
import { parsePagination, paginatedResponse } from "@/lib/api-utils";
import { syncLeadCreatedToPipeline } from "@/lib/lead-pipeline-sync";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const queryResult = LeadsGetQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    if (!queryResult.success) {
      return apiErrors.validationError(
        "Invalid query parameters",
        queryResult.error.flatten(),
      );
    }
    const { status, search } = queryResult.data;
    const pagination = parsePagination(request);

    const resolveScopedUserIds = async (
      db: ReturnType<typeof getCrmDb>,
    ): Promise<string[]> => {
      const ids = new Set<string>([session.user.id, ctx.userId]);
      if (session.user.email) {
        const emailUser = await db.user.findFirst({
          where: { email: session.user.email },
          select: { id: true },
        });
        if (emailUser?.id) ids.add(emailUser.id);
      }
      if (session.user.role !== "BUSINESS_OWNER" && session.user.agencyId) {
        try {
          const owner = await db.user.findFirst({
            where: {
              agencyId: session.user.agencyId,
              role: "BUSINESS_OWNER",
            },
            select: { id: true },
          });
          if (owner?.id) ids.add(owner.id);
        } catch {
          // Best effort only
        }
      }
      return Array.from(ids);
    };

    const db = getCrmDb(ctx);
    const scopedUserIds = await resolveScopedUserIds(db);
    const where = {
      userId:
        scopedUserIds.length === 1 ? scopedUserIds[0] : { in: scopedUserIds },
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              {
                businessName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                contactPerson: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          notes: { select: { id: true, createdAt: true } },
          messages: { select: { id: true, createdAt: true } },
        },
        take: pagination.take,
        skip: pagination.skip,
        orderBy: [
          { contactPerson: "asc" },
          { businessName: "asc" },
          { email: "asc" },
          { createdAt: "desc" },
        ],
      }),
      db.lead.count({ where }),
    ]);

    const isOrthoDemo =
      String(session.user.email || "")
        .toLowerCase()
        .trim() === "orthodontist@nexrel.com";
    // Preserve demo behavior only for the dedicated orthodontist demo account
    if (isOrthoDemo && leads.length === 0 && total === 0) {
      const { MOCK_LEADS } = await import("@/lib/mock-data");
      const mockLeads = MOCK_LEADS.slice(0, pagination.take);
      return paginatedResponse(
        mockLeads,
        MOCK_LEADS.length,
        pagination,
        "leads",
      );
    }

    return paginatedResponse(leads, total, pagination, "leads");
  } catch (error) {
    console.error("Get leads error:", error);
    return apiErrors.internal("Failed to fetch leads");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiErrors.badRequest("Invalid JSON body");
    }

    const parseResult = LeadCreateBodySchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validationError(
        "Invalid lead data",
        parseResult.error.flatten(),
      );
    }
    const data = parseResult.data;

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const lead = await leadService.create(ctx, data);

    emitCRMEvent("lead_created", session.user.id, {
      entityId: lead.id,
      entityType: "Lead",
      data: { name: lead.businessName || lead.contactPerson },
    });

    syncLeadCreatedToPipeline(session.user.id, lead).catch((err) => {
      console.error("[LeadPipelineSync] Failed on lead creation:", err);
    });

    // Trigger workflows on lead creation (RE and industry auto-run)
    const industry = ctx.industry;

    if (industry === "REAL_ESTATE") {
      detectLeadWorkflowTriggers(session.user.id, lead.id).catch((err) => {
        console.error(
          "[RE Workflow] Failed to trigger workflow for lead:",
          err,
        );
      });
    } else if (industry) {
      const { detectIndustryLeadWorkflowTriggers } = await import(
        "@/lib/industry-workflows/lead-triggers"
      );
      detectIndustryLeadWorkflowTriggers(
        session.user.id,
        lead.id,
        industry,
      ).catch((err) => {
        console.error(
          "[Industry Workflow] Failed to trigger workflows for lead:",
          err,
        );
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Create lead error:", error);
    return apiErrors.internal("Failed to create lead");
  }
}
