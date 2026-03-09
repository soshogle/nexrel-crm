import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/teams - List all teams

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get("divisionId");
    const programId = searchParams.get("programId");

    const where: any = {
      userId: session.user.id,
    };

    if (divisionId) where.divisionId = divisionId;

    const teams = await db.clubOSTeam.findMany({
      where,
      include: {
        division: {
          include: {
            program: true,
          },
        },
        members: {
          include: {
            member: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Filter by program if provided
    let filteredTeams = teams;
    if (programId) {
      filteredTeams = teams.filter(
        (team) => team.division.programId === programId,
      );
    }

    return NextResponse.json({ teams: filteredTeams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return apiErrors.internal("Failed to fetch teams");
  }
}

// POST /api/clubos/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const {
      divisionId,
      name,
      ageGroup,
      coachName,
      coachEmail,
      coachPhone,
      maxPlayers,
    } = body;

    if (!divisionId || !name) {
      return apiErrors.badRequest("Missing required fields: divisionId, name");
    }

    const team = await db.clubOSTeam.create({
      data: {
        divisionId,
        name,
        maxPlayers,
        status: "FORMING",
      },
      include: {
        division: {
          include: {
            program: true,
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return apiErrors.internal("Failed to create team");
  }
}
