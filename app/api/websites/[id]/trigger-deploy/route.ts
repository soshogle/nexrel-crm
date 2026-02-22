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

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const website = await websiteService.findUnique(ctx, id);

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
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
