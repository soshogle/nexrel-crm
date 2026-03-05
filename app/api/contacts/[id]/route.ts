import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { leadService } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { contactUpdateSchema, sanitizeTags } from "@/lib/contact-input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const contact = await leadService.findUnique(ctx, params.id, {
      _count: {
        select: {
          deals: true,
          messages: true,
          callLogs: true,
        },
      },
    } as any);

    if (!contact) {
      return apiErrors.notFound("Contact not found");
    }

    return NextResponse.json({
      ...contact,
      tags: Array.isArray((contact as any).tags) ? (contact as any).tags : [],
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return apiErrors.internal("Failed to fetch contact");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json().catch(() => null);
    const parseResult = contactUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validationError(
        "Invalid contact payload",
        parseResult.error.flatten(),
      );
    }

    const contact = await leadService.findUnique(ctx, params.id);
    if (!contact) {
      return apiErrors.notFound("Contact not found");
    }

    const updatedContact = await leadService.update(ctx, params.id, {
      ...parseResult.data,
    });

    return NextResponse.json({
      ...updatedContact,
      tags: sanitizeTags(updatedContact.tags),
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return apiErrors.internal("Failed to update contact");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const contact = await leadService.findUnique(ctx, params.id);
    if (!contact) {
      return apiErrors.notFound("Contact not found");
    }

    await leadService.delete(ctx, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return apiErrors.internal("Failed to delete contact");
  }
}
