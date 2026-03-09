import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PUT /api/general-inventory/locations/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Verify ownership
    const existingLocation = await db.generalInventoryLocation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingLocation) {
      return apiErrors.notFound("Location not found");
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.generalInventoryLocation.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          id: { not: params.id },
        },
        data: { isDefault: false },
      });
    }

    const location = await db.generalInventoryLocation.update({
      where: { id: params.id },
      data: {
        name,
        address,
        type,
        isDefault,
      },
    });

    return NextResponse.json({ success: true, location });
  } catch (error: any) {
    console.error("Error updating location:", error);
    return apiErrors.internal(error.message);
  }
}

// DELETE /api/general-inventory/locations/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Verify ownership
    const existingLocation = await db.generalInventoryLocation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!existingLocation) {
      return apiErrors.notFound("Location not found");
    }

    // Check if location has items
    if (existingLocation._count.items > 0) {
      return apiErrors.badRequest(
        "Cannot delete location with items. Please remove or reassign items first.",
      );
    }

    await db.generalInventoryLocation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting location:", error);
    return apiErrors.internal(error.message);
  }
}
