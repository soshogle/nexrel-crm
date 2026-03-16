/**
 * Blog API
 * GET  - Public listing (landing page)
 * POST - Create post (auth required)
 * PUT  - Update post (auth required)
 * DELETE - Delete post (auth required)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRouteDb } from "@/lib/dal/get-route-db";
import { apiErrors } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const industry = searchParams.get("industry");
    const category = searchParams.get("category");
    const scope = searchParams.get("scope"); // "platform" = landing page only; "my" = user's posts only

    const session = await getServerSession(authOptions);
    const db = getRouteDb(session);

    const where: Record<string, unknown> = {};
    if (industry) where.industry = industry;
    if (category) where.category = category;

    // scope=platform: landing page posts only (userId null) - used by landing page, /blog
    // scope=my: user's posts only - used by dashboard (requires auth)
    // default: platform (safe for public pages)
    if (scope === "my" && session?.user?.id) {
      where.userId = session.user.id;
    } else {
      where.userId = null; // platform/landing page posts
    }

    const [posts, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      total,
      hasMore: offset + posts.length < total,
    });
  } catch (error: unknown) {
    console.error("[Blog API] List error:", error);
    return apiErrors.internal("Failed to fetch blog posts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const {
      title,
      slug,
      excerpt,
      content,
      category,
      industry,
      problemImage,
      solutionImage,
      readTime,
    } = body;

    if (!title || !content || !category || !industry) {
      return apiErrors.badRequest(
        "title, content, category, and industry are required",
      );
    }

    const finalSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const existing = await db.blogPost.findUnique({
      where: { slug: finalSlug },
    });
    if (existing) {
      return apiErrors.conflict("A post with this slug already exists");
    }

    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime =
      readTime || `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

    const post = await db.blogPost.create({
      data: {
        userId: session.user.id,
        title,
        slug: finalSlug,
        excerpt:
          excerpt ||
          content.substring(0, 160).replace(/[#*_\[\]]/g, "") + "...",
        content,
        category,
        industry,
        problemImage: problemImage || null,
        solutionImage: solutionImage || null,
        readTime: estimatedReadTime,
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (error: unknown) {
    console.error("[Blog API] Create error:", error);
    return apiErrors.internal("Failed to create blog post");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const {
      id,
      title,
      slug,
      excerpt,
      content,
      category,
      industry,
      problemImage,
      solutionImage,
      readTime,
    } = body;

    if (!id) {
      return apiErrors.badRequest("id is required");
    }

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return apiErrors.notFound("Post not found");
    }
    if (existing.userId !== session.user.id) {
      return apiErrors.forbidden("You can only edit your own posts");
    }

    if (slug && slug !== existing.slug) {
      const slugTaken = await db.blogPost.findUnique({ where: { slug } });
      if (slugTaken) {
        return apiErrors.conflict("Slug already taken");
      }
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (content !== undefined) {
      data.content = content;
      if (!readTime) {
        const wordCount = content.split(/\s+/).length;
        data.readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
      }
    }
    if (category !== undefined) data.category = category;
    if (industry !== undefined) data.industry = industry;
    if (problemImage !== undefined) data.problemImage = problemImage;
    if (solutionImage !== undefined) data.solutionImage = solutionImage;
    if (readTime !== undefined) data.readTime = readTime;

    const post = await db.blogPost.update({ where: { id }, data });

    return NextResponse.json({ success: true, post });
  } catch (error: unknown) {
    console.error("[Blog API] Update error:", error);
    return apiErrors.internal("Failed to update blog post");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return apiErrors.badRequest("id is required");
    }

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return apiErrors.notFound("Post not found");
    }
    if (existing.userId !== session.user.id) {
      return apiErrors.forbidden("You can only delete your own posts");
    }

    await db.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Blog API] Delete error:", error);
    return apiErrors.internal("Failed to delete blog post");
  }
}
