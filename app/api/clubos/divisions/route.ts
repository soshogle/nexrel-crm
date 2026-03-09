import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/divisions - List divisions

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

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    const where: any = {
      program: {
        userId: session.user.id,
      },
    };
    if (programId) where.programId = programId;

    const divisions = await db.clubOSDivision.findMany({
      where,
      include: {
        program: true,
        teams: true,
        _count: {
          select: { teams: true, registrations: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ divisions });
  } catch (error: any) {
    console.error("Error fetching divisions:", error);
    return apiErrors.internal(error.message || "Failed to fetch divisions");
  }
}

// POST /api/clubos/divisions - Create division
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
    const { programId, name, ageMin, ageMax, gender, skillLevel } = body;

    if (!programId || !name) {
      return apiErrors.badRequest("Missing required fields: programId, name");
    }

    const division = await db.clubOSDivision.create({
      data: {
        programId,
        name,
        ageMin,
        ageMax,
        gender: gender || "COED",
        skillLevel,
      },
      include: {
        program: true,
      },
    });

    return NextResponse.json({ division });
  } catch (error: any) {
    console.error("Error creating division:", error);
    return apiErrors.internal(error.message || "Failed to create division");
  }
}
