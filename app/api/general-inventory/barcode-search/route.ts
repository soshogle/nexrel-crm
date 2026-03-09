import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/general-inventory/barcode-search - Search inventory by barcode or SKU
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length === 0) {
      return apiErrors.badRequest("Search query is required");
    }

    // Search by barcode or SKU (exact match or starts with)
    const items = await db.generalInventoryItem.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        OR: [
          { barcode: { equals: query } },
          { barcode: { startsWith: query } },
          { sku: { equals: query } },
          { sku: { startsWith: query } },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error: any) {
    console.error("Error searching by barcode:", error);
    return apiErrors.internal(error.message || "Search failed");
  }
}
