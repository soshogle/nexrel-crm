/**
 * SMS Templates API
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { parsePagination, paginatedResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const pagination = parsePagination(req);

    const where: any = { userId: ctx.userId, ...(category && { category }) };

    const templates = await db.sMSTemplate.findMany({
      where,
      take: pagination.take,
      skip: pagination.skip,
      orderBy: { name: "asc" },
    });

    const total = await db.sMSTemplate.count({ where });
    return paginatedResponse(templates, total, pagination, "templates");
  } catch (error: any) {
    console.error("Error fetching SMS templates:", error);
    return apiErrors.internal(error.message || "Failed to fetch templates");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await req.json();
    const { name, message, variables, category, isDefault } = body;

    if (!name || !message) {
      return apiErrors.badRequest("name and message are required");
    }

    const template = await db.sMSTemplate.create({
      data: {
        userId: ctx.userId,
        name,
        message,
        variables: variables ?? null,
        category: category ?? null,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error creating SMS template:", error);
    return apiErrors.internal(error.message || "Failed to create template");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await req.json();
    const { id, name, message, variables, category, isDefault } = body;

    if (!id) {
      return apiErrors.badRequest("Template ID required");
    }

    const existing = await db.sMSTemplate.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!existing) {
      return apiErrors.notFound("Template not found");
    }

    const template = await db.sMSTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(message && { message }),
        ...(variables !== undefined && { variables }),
        ...(category !== undefined && { category }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error updating SMS template:", error);
    return apiErrors.internal(error.message || "Failed to update template");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return apiErrors.badRequest("Template ID required");
    }

    const existing = await db.sMSTemplate.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!existing) {
      return apiErrors.notFound("Template not found");
    }

    await db.sMSTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting SMS template:", error);
    return apiErrors.internal(error.message || "Failed to delete template");
  }
}
