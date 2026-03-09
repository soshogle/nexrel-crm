import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// DELETE - Delete a payment provider

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // Verify ownership
    const provider = await db.paymentProviderSettings.findUnique({
      where: { id: params.id },
    });

    if (!provider || provider.userId !== session.user.id) {
      return apiErrors.notFound("Provider not found");
    }

    await db.paymentProviderSettings.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment provider:", error);
    return apiErrors.internal("Failed to delete payment provider");
  }
}

// PATCH - Toggle provider active status
export async function PATCH(
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
    const { isActive, isDefault } = body;

    // Verify ownership
    const provider = await db.paymentProviderSettings.findUnique({
      where: { id: params.id },
    });

    if (!provider || provider.userId !== session.user.id) {
      return apiErrors.notFound("Provider not found");
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

    const updated = await db.paymentProviderSettings.update({
      where: { id: params.id },
      data: {
        isActive: isActive !== undefined ? isActive : provider.isActive,
        isDefault: isDefault !== undefined ? isDefault : provider.isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      provider: {
        id: updated.id,
        provider: updated.provider,
        isActive: updated.isActive,
        isDefault: updated.isDefault,
      },
    });
  } catch (error) {
    console.error("Error updating payment provider:", error);
    return apiErrors.internal("Failed to update payment provider");
  }
}
