import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/teams/[id] - Get specific team

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
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

    const team = await db.clubOSTeam.findUnique({
      where: { id: params.id },
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
    });

    if (!team) {
      return apiErrors.notFound("Team not found");
    }

    // Verify ownership via division -> program
    if (team.division.program.userId !== session.user.id) {
      return apiErrors.forbidden("Unauthorized");
    }

    return NextResponse.json({ team });
  } catch (error: any) {
    console.error("Error fetching team:", error);
    return apiErrors.internal(error.message || "Failed to fetch team");
  }
}

// PUT /api/clubos/teams/[id] - Update team
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
    const { name, colorPrimary, colorSecondary, status, maxPlayers } = body;

    // Get team and verify ownership
    const existingTeam = await db.clubOSTeam.findUnique({
      where: { id: params.id },
      include: {
        division: {
          include: { program: true },
        },
      },
    });

    if (!existingTeam) {
      return apiErrors.notFound("Team not found");
    }

    if (existingTeam.division.program.userId !== session.user.id) {
      return apiErrors.forbidden("Unauthorized");
    }

    const team = await db.clubOSTeam.update({
      where: { id: params.id },
      data: {
        name,
        colorPrimary,
        colorSecondary,
        status,
        maxPlayers,
      },
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
    });

    return NextResponse.json({ team });
  } catch (error: any) {
    console.error("Error updating team:", error);
    return apiErrors.internal(error.message || "Failed to update team");
  }
}

// DELETE /api/clubos/teams/[id] - Delete team
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

    // Get team and verify ownership
    const team = await db.clubOSTeam.findUnique({
      where: { id: params.id },
      include: {
        division: {
          include: { program: true },
        },
      },
    });

    if (!team) {
      return apiErrors.notFound("Team not found");
    }

    if (team.division.program.userId !== session.user.id) {
      return apiErrors.forbidden("Unauthorized");
    }

    await db.clubOSTeam.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting team:", error);
    return apiErrors.internal(error.message || "Failed to delete team");
  }
}
