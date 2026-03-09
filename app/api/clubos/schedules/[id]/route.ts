import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/clubos/schedules/[id] - Get single schedule

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const schedule = await db.clubOSSchedule.findUnique({
      where: { id: params.id },
      include: {
        venue: true,
        homeTeam: {
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
        },
        awayTeam: {
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
        },
        practiceTeam: {
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
        },
      },
    });

    if (!schedule) {
      return apiErrors.notFound("Schedule not found");
    }

    if (schedule.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return apiErrors.internal("Failed to fetch schedule");
  }
}

// PUT /api/clubos/schedules/[id] - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
      eventType,
      status,
      title,
      description,
      startTime,
      endTime,
      venueId,
      homeTeamId,
      awayTeamId,
      practiceTeamId,
      homeScore,
      awayScore,
      notes,
    } = body;

    const existing = await db.clubOSSchedule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return apiErrors.notFound("Schedule not found");
    }

    if (existing.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const schedule = await db.clubOSSchedule.update({
      where: { id: params.id },
      data: {
        eventType,
        status,
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        venueId,
        homeTeamId,
        awayTeamId,
        practiceTeamId,
        homeScore,
        awayScore,
        notes,
      },
      include: {
        venue: true,
        homeTeam: {
          include: {
            division: true,
          },
        },
        awayTeam: {
          include: {
            division: true,
          },
        },
        practiceTeam: {
          include: {
            division: true,
          },
        },
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error updating schedule:", error);
    return apiErrors.internal("Failed to update schedule");
  }
}

// DELETE /api/clubos/schedules/[id] - Delete (cancel) schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const existing = await db.clubOSSchedule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return apiErrors.notFound("Schedule not found");
    }

    if (existing.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    // Soft delete by setting status to CANCELLED
    await db.clubOSSchedule.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ message: "Schedule cancelled successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return apiErrors.internal("Failed to delete schedule");
  }
}
