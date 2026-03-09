import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/general-inventory/locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const locations = await db.generalInventoryLocation.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, locations });
  } catch (error: any) {
    console.error("Error fetching locations:", error);
    return apiErrors.internal(error.message);
  }
}

// POST /api/general-inventory/locations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { name, address, type, isDefault } = body;

    if (!name) {
      return apiErrors.badRequest("Name is required");
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.generalInventoryLocation.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const location = await db.generalInventoryLocation.create({
      data: {
        userId: session.user.id,
        name,
        address,
        type,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({ success: true, location });
  } catch (error: any) {
    console.error("Error creating location:", error);
    return apiErrors.internal(error.message);
  }
}
