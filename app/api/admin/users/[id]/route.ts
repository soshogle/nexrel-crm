/**
 * Admin User Detail API
 * Get, update individual business account details
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return apiErrors.forbidden("Unauthorized - Admin access required");
    }

    const user = await getMetaDb().user.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        featureToggles: true,
        agency: true,
        _count: {
          select: {
            leads: true,
            voiceAgents: true,
            campaigns: true,
            deals: true,
            appointments: true,
          },
        },
      },
    });

    if (!user) {
      return apiErrors.notFound("User not found");
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("❌ Error fetching user:", error);
    return apiErrors.internal("Failed to fetch user", error.message);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return apiErrors.forbidden("Unauthorized - Admin access required");
    }

    const body = await req.json();
    const { industry, accountStatus, suspendedReason, trialEndsAt, language } =
      body;

    // Validate language if provided
    if (language) {
      const supportedLanguages = ["en", "fr", "es", "zh"];
      if (!supportedLanguages.includes(language)) {
        return apiErrors.badRequest(
          "Unsupported language. Supported: en, fr, es, zh",
        );
      }
    }

    // Update user
    const user = await getMetaDb().user.update({
      where: { id: params.id },
      data: {
        ...(industry && { industry }),
        ...(accountStatus && {
          accountStatus,
          ...(accountStatus === "SUSPENDED" && { suspendedAt: new Date() }),
          ...(accountStatus !== "SUSPENDED" && { suspendedAt: null }),
        }),
        ...(suspendedReason !== undefined && { suspendedReason }),
        ...(trialEndsAt && { trialEndsAt: new Date(trialEndsAt) }),
        ...(language && { language }),
      },
      include: {
        subscription: true,
        featureToggles: true,
      },
    });

    // Log admin action
    await getMetaDb().adminAction.create({
      data: {
        adminId: session.user.id,
        adminEmail: session.user.email || "",
        targetUserId: params.id,
        targetUserEmail: user.email,
        action: "UPDATE_USER",
        details: body,
        ipAddress:
          req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ user, message: "User updated successfully" });
  } catch (error: any) {
    console.error("❌ Error updating user:", error);
    return apiErrors.internal("Failed to update user", error.message);
  }
}
