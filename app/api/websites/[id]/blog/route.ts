/**
 * GET /api/websites/[id]/blog
 * Website-scoped blog API for owner-deployed sites (e.g. Theodora).
 * Returns only posts for this website — NOT the Nexrel landing page content.
 * Auth: x-website-secret header (template server fetches)
 *
 * Use this URL from owner templates instead of /api/blog.
 * Landing page and CRM dashboard continue to use /api/blog.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmDb } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { authorizeWebsiteSecret } from "@/lib/website-secret-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const websiteId = params.id;
    if (!websiteId) {
      return apiErrors.badRequest("Website ID required");
    }

    const secret = request.headers.get("x-website-secret");
    const auth = await authorizeWebsiteSecret(websiteId, secret);
    if (!auth.ok) {
      return auth.status === 404
        ? apiErrors.notFound(auth.reason)
        : auth.status === 500
          ? apiErrors.internal(auth.reason)
          : apiErrors.unauthorized(auth.reason);
    }

    const db = getCrmDb(createDalContext("bootstrap"));
    const website = await db.website.findFirst({
      where: { id: websiteId },
      select: { id: true },
    });
    if (!website) {
      return apiErrors.notFound("Website not found");
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    // BlogPost has no websiteId yet — return empty for owner sites.
    // Nexrel landing posts stay in /api/blog. When we add websiteId to BlogPost,
    // filter: where: { websiteId: websiteId }.
    const posts: unknown[] = [];
    const total = 0;

    return NextResponse.json(
      {
        posts,
        total,
        hasMore: false,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[websites blog] Error:", error);
    return apiErrors.internal();
  }
}
