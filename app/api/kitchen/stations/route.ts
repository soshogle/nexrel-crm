import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET KITCHEN STATIONS
 * List all kitchen stations
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

    const stations = await db.kitchenStation.findMany({
      where,
      include: {
        _count: {
          select: {
            kitchenItems: {
              where: {
                status: {
                  in: ["PENDING", "PREPARING"],
                },
              },
            },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(stations);
  } catch (error) {
    console.error("❌ Kitchen stations fetch error:", error);
    return apiErrors.internal("Failed to fetch stations");
  }
}

/**
 * CREATE KITCHEN STATION
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
      displayName,
      color,
      icon,
      priority = 0,
      maxCapacity,
      defaultPrepTime = 15,
    } = body;

    // Validate required fields
    if (!name || !displayName) {
      return apiErrors.badRequest("Station name and display name are required");
    }

    // Create station
    const station = await db.kitchenStation.create({
      data: {
        userId: session.user.id,
        name,
        displayName,
        color,
        icon,
        priority,
        maxCapacity,
        defaultPrepTime,
      },
    });

    console.log(`✅ Kitchen station created: ${name}`);

    return NextResponse.json(station, { status: 201 });
  } catch (error) {
    console.error("❌ Kitchen station creation error:", error);
    return apiErrors.internal("Failed to create station");
  }
}
