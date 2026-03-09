import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import bcrypt from "bcryptjs";
import { apiErrors } from "@/lib/api-error";
import { provisionAIEmployeesForUser } from "@/lib/ai-employee-auto-provision";
import {
  createNeonTenantDatabase,
  deleteNeonProject,
  persistTenantOverride,
  tenantDatabaseEnvKey,
  verifyDatabaseConnection,
} from "@/lib/tenancy/owner-db-provisioning";
import { resolveTenantRoutingByUserId } from "@/lib/tenancy/tenant-registry";
import { Industry } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_INDUSTRIES = Object.values(Industry);

/**
 * POST /api/platform-admin/create-business-owner
 * Creates a new business owner account that will go through onboarding
 * If industry is provided, AI employees are provisioned immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Verify Super Admin access
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return apiErrors.forbidden("Unauthorized - Super Admin access required");
    }

    const body = await request.json();
    const {
      email,
      password,
      name,
      phone,
      businessCategory,
      industry,
      provisionDedicatedDb,
    } = body;

    if (provisionDedicatedDb === false) {
      return apiErrors.badRequest(
        "Dedicated database provisioning is mandatory for business-owner creation",
      );
    }

    // Validate required fields
    if (!email || !password || !name) {
      return apiErrors.badRequest(
        "Missing required fields: email, password, name",
      );
    }

    // Validate industry if provided
    const industryValue =
      industry && VALID_INDUSTRIES.includes(industry) ? industry : null;

    // Check if user already exists
    const existingUser = await getMetaDb().user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiErrors.conflict("A user with this email already exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const shouldProvisionDedicatedDb = true;

    let newUser: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      industry: Industry | null;
    } | null = null;
    let neonProjectId: string | null = null;
    let dedicatedDbKey: string | null = null;

    try {
      newUser = await getMetaDb().user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone: phone || null,
          businessCategory: businessCategory || null,
          role: "BUSINESS_OWNER",
          onboardingCompleted: false,
          industry: industryValue || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          industry: true,
        },
      });

      if (shouldProvisionDedicatedDb) {
        dedicatedDbKey = tenantDatabaseEnvKey(newUser.id);
        const neon = await createNeonTenantDatabase({
          tenantId: newUser.id,
          email: newUser.email,
        });
        neonProjectId = neon.projectId;

        await verifyDatabaseConnection(neon.databaseUrl);
        await persistTenantOverride({
          tenantId: newUser.id,
          databaseEnvKey: dedicatedDbKey,
          databaseUrl: neon.databaseUrl,
        });

        const routing = await resolveTenantRoutingByUserId(newUser.id);
        if (
          !routing ||
          routing.routingMode !== "TENANT_OVERRIDE" ||
          routing.databaseEnvKey !== dedicatedDbKey ||
          !routing.databaseUrlConfigured
        ) {
          throw new Error(
            "Tenant DB routing verification failed after provisioning",
          );
        }
      }
    } catch (provisionError: any) {
      if (newUser?.id) {
        try {
          await getMetaDb().user.delete({ where: { id: newUser.id } });
        } catch (cleanupUserError) {
          console.error("Failed to rollback user creation:", cleanupUserError);
        }
      }
      if (neonProjectId) {
        try {
          await deleteNeonProject(neonProjectId);
        } catch (cleanupNeonError) {
          console.error("Failed to cleanup Neon project:", cleanupNeonError);
        }
      }
      throw provisionError;
    }

    if (!newUser) {
      return apiErrors.internal("User creation failed");
    }

    console.log("✅ Business owner created:", {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      industry: industryValue ?? "(will select during onboarding)",
    });

    // If industry was set, provision AI employees immediately (fire-and-forget)
    if (industryValue) {
      provisionAIEmployeesForUser(newUser.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        industry: newUser.industry,
        dedicatedDatabase: shouldProvisionDedicatedDb,
        databaseEnvKey: dedicatedDbKey,
      },
      message: industryValue
        ? "Business owner account created with dedicated database. AI employees are being provisioned. They will go through onboarding on first login."
        : "Business owner account created with dedicated database. They will go through onboarding on first login.",
    });
  } catch (error: any) {
    console.error("Error creating business owner:", error);
    return apiErrors.internal(
      error.message || "Failed to create business owner",
    );
  }
}
