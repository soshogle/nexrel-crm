/**
 * POST /api/websites/[id]/trigger-deploy
 * Manually trigger a deploy (for testing). Returns { ok, error }.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { websiteService } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { triggerWebsiteDeploy } from "@/lib/website-builder/deploy-trigger";
import { apiErrors } from '@/lib/api-error';

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { id } = await params;
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const website = await websiteService.findUnique(ctx, id);

    if (!website) {
      return apiErrors.notFound("Website not found");
    }

    const result = await triggerWebsiteDeploy(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[trigger-deploy]", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed" },
      { status: 500 }
    );
  }
}
