import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET SUPPLIER BY ID
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const supplier = await db.supplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        purchaseOrders: {
          orderBy: { orderDate: "desc" },
          take: 10,
        },
        _count: {
          select: {
            items: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!supplier) {
      return apiErrors.notFound("Supplier not found");
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("❌ Supplier fetch error:", error);
    return apiErrors.internal("Failed to fetch supplier");
  }
}

/**
 * UPDATE SUPPLIER
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const body = await req.json();

    // Verify supplier exists
    const existing = await db.supplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return apiErrors.notFound("Supplier not found");
    }

    const updatedSupplier = await db.supplier.update({
      where: { id: params.id },
      data: body,
    });

    console.log(`✅ Supplier updated: ${updatedSupplier.name}`);

    return NextResponse.json(updatedSupplier);
  } catch (error) {
    console.error("❌ Supplier update error:", error);
    return apiErrors.internal("Failed to update supplier");
  }
}

/**
 * DELETE SUPPLIER
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    // Verify supplier exists
    const supplier = await db.supplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            items: true,
            purchaseOrders: {
              where: {
                status: {
                  in: ["DRAFT", "SENT", "CONFIRMED"],
                },
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      return apiErrors.notFound("Supplier not found");
    }

    // Check if supplier has active purchase orders
    if (supplier._count.purchaseOrders > 0) {
      return apiErrors.badRequest(
        "Cannot delete supplier with active purchase orders",
      );
    }

    // Soft delete by marking as inactive
    await db.supplier.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    console.log(`✅ Supplier deactivated: ${supplier.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Supplier delete error:", error);
    return apiErrors.internal("Failed to delete supplier");
  }
}
