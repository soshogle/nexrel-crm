import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/tasks/templates - List task templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: any = {
      userId: session.user.id,
    };

    if (category) {
      where.category = category;
    }

    const templates = await getCrmDb(ctx).taskTemplate.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return apiErrors.internal(error.message || "Failed to fetch templates");
  }
}

// POST /api/tasks/templates - Create task template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json();
    const {
      name,
      description,
      category,
      defaultPriority,
      estimatedHours,
      tags,
      checklistItems,
    } = body;

    if (!name) {
      return apiErrors.badRequest("Name is required");
    }

    const template = await getCrmDb(ctx).taskTemplate.create({
      data: {
        name,
        description: description || null,
        category: category || null,
        defaultPriority: defaultPriority || "MEDIUM",
        estimatedHours: estimatedHours || null,
        tags: tags || [],
        checklistItems: checklistItems || [],
        userId: session.user.id,
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Error creating template:", error);
    return apiErrors.internal(error.message || "Failed to create template");
  }
}
