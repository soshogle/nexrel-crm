import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/general-inventory/suppliers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const suppliers = await db.generalInventorySupplier.findMany({
      where: { userId: session.user.id, isActive: true },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return apiErrors.internal(error.message);
  }
}

// POST /api/general-inventory/suppliers
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
    const { name, contactName, email, phone, address, website, notes } = body;

    if (!name) {
      return apiErrors.badRequest("Name is required");
    }

    const supplier = await db.generalInventorySupplier.create({
      data: {
        userId: session.user.id,
        name,
        contactName,
        email,
        phone,
        address,
        website,
        notes,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    return apiErrors.internal(error.message);
  }
}
