/**
 * GET /api/blog/[slug] - Get single blog post by slug
 * Public endpoint, no auth required
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return apiErrors.notFound("Post not found");
    }

    return NextResponse.json(post);
  } catch (error: unknown) {
    console.error("[Blog API] Single post error:", error);
    return apiErrors.internal("Failed to fetch blog post");
  }
}
