import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/parent/family - Get family members

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

    // Get household for the user
    const household = await db.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return apiErrors.notFound("Household not found");
    }

    // Get all members with their registrations
    const members = await db.clubOSMember.findMany({
      where: { householdId: household.id },
      include: {
        registrations: {
          where: {
            status: { in: ["PENDING", "APPROVED", "ACTIVE", "WAITLIST"] },
          },
          include: {
            program: {
              select: {
                name: true,
              },
            },
            division: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Error fetching family members:", error);
    return apiErrors.internal(
      error.message || "Failed to fetch family members",
    );
  }
}

// POST /api/clubos/parent/family - Add family member
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
    const { firstName, lastName, dateOfBirth, gender } = body;

    if (!firstName || !lastName || !dateOfBirth || !gender) {
      return apiErrors.badRequest(
        "Missing required fields: firstName, lastName, dateOfBirth, gender",
      );
    }

    // Get household for the user
    const household = await db.clubOSHousehold.findUnique({
      where: { userId: session.user.id },
    });

    if (!household) {
      return apiErrors.notFound("Household not found");
    }

    // Create member
    const member = await db.clubOSMember.create({
      data: {
        householdId: household.id,
        memberType: "PLAYER",
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        waiverSigned: false,
      },
      include: {
        registrations: {
          include: {
            program: {
              select: {
                name: true,
              },
            },
            division: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ member });
  } catch (error: any) {
    console.error("Error creating family member:", error);
    return apiErrors.internal(
      error.message || "Failed to create family member",
    );
  }
}
