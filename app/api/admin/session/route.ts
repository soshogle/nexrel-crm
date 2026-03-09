import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import bcrypt from "bcryptjs";
import {
  createAdminSession,
  hasValidAdminSession,
  invalidateAdminSession,
} from "@/lib/permissions";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/admin/session - Verify password and create admin session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return apiErrors.badRequest("Password required");
    }

    // Get user from database
    const user = await getMetaDb().user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return apiErrors.unauthorized("Invalid credentials");
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return apiErrors.unauthorized("Invalid password");
    }

    // Create admin session
    const ipAddress =
      request.ip || request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const sessionToken = await createAdminSession(
      user.id,
      ipAddress,
      userAgent,
    );

    return NextResponse.json({
      success: true,
      sessionToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    });
  } catch (error: any) {
    console.error("Error creating admin session:", error);
    return apiErrors.internal(
      error.message || "Failed to create admin session",
    );
  }
}

// GET /api/admin/session - Check if admin session is valid
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const isValid = await hasValidAdminSession(session.user.id);

    return NextResponse.json({
      isValid,
    });
  } catch (error: any) {
    console.error("Error checking admin session:", error);
    return apiErrors.internal(error.message || "Failed to check admin session");
  }
}

// DELETE /api/admin/session - Invalidate admin session
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("sessionToken");

    if (!sessionToken) {
      return apiErrors.badRequest("Session token required");
    }

    await invalidateAdminSession(sessionToken);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error invalidating admin session:", error);
    return apiErrors.internal(
      error.message || "Failed to invalidate admin session",
    );
  }
}
