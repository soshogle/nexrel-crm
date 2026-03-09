import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

// GET /api/user/subdomain - Get current user's subdomain

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const user = await getMetaDb().user.findUnique({
      where: { id: session.user.id },
      select: {
        subdomain: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return apiErrors.notFound("User not found");
    }

    // Generate suggested subdomain if none exists
    let suggestedSubdomain = null;
    if (!user.subdomain) {
      // Create subdomain from business name or email
      const baseName = user.name || user.email.split("@")[0];
      suggestedSubdomain = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20);
    }

    return NextResponse.json({
      subdomain: user.subdomain,
      suggestedSubdomain,
      subdomainUrl: user.subdomain
        ? `https://${user.subdomain}.soshogle.com`
        : null,
    });
  } catch (error: any) {
    console.error("Error fetching subdomain:", error);
    return apiErrors.internal(error.message || "Failed to fetch subdomain");
  }
}

// POST /api/user/subdomain - Set or update subdomain
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { subdomain } = body;

    if (!subdomain) {
      return apiErrors.badRequest("Subdomain is required");
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return apiErrors.badRequest(
        "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.",
      );
    }

    // Check for reserved subdomains
    const reserved = [
      "www",
      "app",
      "api",
      "admin",
      "cdn",
      "static",
      "mail",
      "email",
      "smtp",
      "ftp",
      "blog",
      "shop",
      "store",
      "support",
      "help",
      "docs",
      "status",
      "dashboard",
    ];
    if (reserved.includes(subdomain.toLowerCase())) {
      return apiErrors.badRequest(
        "This subdomain is reserved and cannot be used",
      );
    }

    // Check if subdomain is already taken
    const existing = await getMetaDb().user.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    if (existing && existing.id !== session.user.id) {
      return apiErrors.conflict("This subdomain is already taken");
    }

    // Update user's subdomain
    const user = await getMetaDb().user.update({
      where: { id: session.user.id },
      data: { subdomain },
      select: {
        subdomain: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      subdomain: user.subdomain,
      subdomainUrl: `https://${user.subdomain}.soshogle.com`,
      message: `Subdomain set to: ${user.subdomain}.soshogle.com`,
    });
  } catch (error: any) {
    console.error("Error setting subdomain:", error);
    return apiErrors.internal(error.message || "Failed to set subdomain");
  }
}

// DELETE /api/user/subdomain - Remove subdomain
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    await getMetaDb().user.update({
      where: { id: session.user.id },
      data: { subdomain: null },
    });

    return NextResponse.json({
      success: true,
      message: "Subdomain removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing subdomain:", error);
    return apiErrors.internal(error.message || "Failed to remove subdomain");
  }
}
