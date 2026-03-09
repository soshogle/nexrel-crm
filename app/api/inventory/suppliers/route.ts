import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET SUPPLIERS
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const where: any = { userId: session.user.id };
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const suppliers = await db.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            items: true,
            purchaseOrders: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("❌ Suppliers fetch error:", error);
    return apiErrors.internal("Failed to fetch suppliers");
  }
}

/**
 * CREATE SUPPLIER
 */
export async function POST(req: NextRequest) {
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
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      taxId,
      paymentTerms,
      notes,
      rating,
    } = body;

    // Validate required fields
    if (!name) {
      return apiErrors.badRequest("Supplier name is required");
    }

    const supplier = await db.supplier.create({
      data: {
        userId: session.user.id,
        name,
        contactPerson,
        email,
        phone,
        address,
        taxId,
        paymentTerms,
        notes,
        rating,
      },
    });

    console.log(`✅ Supplier created: ${name}`);

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("❌ Supplier creation error:", error);
    return apiErrors.internal("Failed to create supplier");
  }
}
