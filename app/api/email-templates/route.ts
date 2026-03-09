/**
 * Email Templates API
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

    const templates = await db.emailTemplate.findMany({
      where,
      take: pagination.take,
      skip: pagination.skip,
      orderBy: { name: "asc" },
    });

    const total = await db.emailTemplate.count({ where });
    return paginatedResponse(templates, total, pagination, "templates");
  } catch (error: any) {
    console.error("Error fetching email templates:", error);
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
    const {
      name,
      subject,
      body: bodyText,
      bodyHtml,
      variables,
      category,
      isDefault,
    } = body;

    if (!name || !subject || !bodyText) {
      return apiErrors.badRequest("name, subject, and body are required");
    }

    const template = await db.emailTemplate.create({
      data: {
        userId: ctx.userId,
        name,
        subject,
        body: bodyText,
        bodyHtml: bodyHtml ?? null,
        variables: variables ?? null,
        category: category ?? null,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error creating email template:", error);
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
    const {
      id,
      name,
      subject,
      body: bodyText,
      bodyHtml,
      variables,
      category,
      isDefault,
    } = body;

    if (!id) {
      return apiErrors.badRequest("Template ID required");
    }

    const existing = await db.emailTemplate.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!existing) {
      return apiErrors.notFound("Template not found");
    }

    const template = await db.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(bodyText && { body: bodyText }),
        ...(bodyHtml !== undefined && { bodyHtml }),
        ...(variables !== undefined && { variables }),
        ...(category !== undefined && { category }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error updating email template:", error);
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

    const existing = await db.emailTemplate.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!existing) {
      return apiErrors.notFound("Template not found");
    }

    await db.emailTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting email template:", error);
    return apiErrors.internal(error.message || "Failed to delete template");
  }
}
