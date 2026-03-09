import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/households - Get household for current user

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const household = await db.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
      include: {
        members: true,
        registrations: {
          include: {
            member: true,
            program: true,
            division: true,
          },
        },
        payments: true,
        invoices: true,
      },
    });

    return NextResponse.json({
      success: true,
      households: household ? [household] : [],
    });
  } catch (error) {
    console.error("Error fetching household:", error);
    return apiErrors.internal("Failed to fetch household");
  }
}

// POST /api/clubos/households - Create a new household
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
    const {
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      emergencyPhone,
      notes,
    } = body;

    // Check if household already exists
    const existingHousehold = await db.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (existingHousehold) {
      return apiErrors.badRequest("Household already exists for this user");
    }

    const household = await db.clubOSHousehold.create({
      data: {
        userId: session.user.id,
        primaryContactName,
        primaryContactEmail,
        primaryContactPhone,
        address,
        city,
        state,
        zipCode,
        emergencyContact,
        emergencyPhone,
        notes,
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({ household }, { status: 201 });
  } catch (error) {
    console.error("Error creating household:", error);
    return apiErrors.internal("Failed to create household");
  }
}

// PUT /api/clubos/households - Update household
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const {
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      emergencyPhone,
      notes,
    } = body;

    const household = await db.clubOSHousehold.update({
      where: { userId: session.user.id },
      data: {
        primaryContactName,
        primaryContactEmail,
        primaryContactPhone,
        address,
        city,
        state,
        zipCode,
        emergencyContact,
        emergencyPhone,
        notes,
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({ household });
  } catch (error) {
    console.error("Error updating household:", error);
    return apiErrors.internal("Failed to update household");
  }
}
