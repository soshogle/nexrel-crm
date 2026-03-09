import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET - Get all payment provider settings

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

    const providers = await db.paymentProviderSettings.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        isActive: true,
        isDefault: true,
        currency: true,
        testMode: true,
        publishableKey: true, // Safe to expose
        createdAt: true,
        updatedAt: true,
        // Don't expose secretKey, webhookSecret, etc.
      },
    });

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Error fetching payment providers:", error);
    return apiErrors.internal("Failed to fetch payment providers");
  }
}

// POST - Create or update payment provider settings
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
    const {
      provider,
      publishableKey,
      secretKey,
      webhookSecret,
      merchantId,
      clientId,
      accountId,
      currency = "USD",
      testMode = true,
      isActive = true,
      isDefault = false,
    } = body;

    if (!provider) {
      return apiErrors.badRequest("Provider is required");
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.paymentProviderSettings.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Upsert the provider settings
    const providerSettings = await db.paymentProviderSettings.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
      create: {
        userId: session.user.id,
        provider,
        publishableKey,
        secretKey,
        webhookSecret,
        merchantId,
        clientId,
        accountId,
        currency,
        testMode,
        isActive,
        isDefault,
      },
      update: {
        publishableKey,
        secretKey,
        webhookSecret,
        merchantId,
        clientId,
        accountId,
        currency,
        testMode,
        isActive,
        isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      provider: {
        id: providerSettings.id,
        provider: providerSettings.provider,
        isActive: providerSettings.isActive,
        isDefault: providerSettings.isDefault,
        currency: providerSettings.currency,
        testMode: providerSettings.testMode,
      },
    });
  } catch (error) {
    console.error("Error saving payment provider:", error);
    return apiErrors.internal("Failed to save payment provider settings");
  }
}
