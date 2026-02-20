/**
 * Blog API
 * GET  - Public listing (landing page)
 * POST - Create post (auth required)
 * PUT  - Update post (auth required)
 * DELETE - Delete post (auth required)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const industry = searchParams.get("industry");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (industry) where.industry = industry;
    if (category) where.category = category;

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      total,
      hasMore: offset + posts.length < total,
    });
  } catch (error: unknown) {
    console.error("[Blog API] List error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, excerpt, content, category, industry, problemImage, solutionImage, readTime } = body;

    if (!title || !content || !category || !industry) {
      return NextResponse.json({ error: "title, content, category, and industry are required" }, { status: 400 });
    }

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return NextResponse.json({ error: "A post with this slug already exists" }, { status: 409 });
    }

    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime = readTime || `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug: finalSlug,
        excerpt: excerpt || content.substring(0, 160).replace(/[#*_\[\]]/g, '') + '...',
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
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, slug, excerpt, content, category, industry, problemImage, solutionImage, readTime } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (slug && slug !== existing.slug) {
      const slugTaken = await prisma.blogPost.findUnique({ where: { slug } });
      if (slugTaken) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
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

    const post = await prisma.blogPost.update({ where: { id }, data });

    return NextResponse.json({ success: true, post });
  } catch (error: unknown) {
    console.error("[Blog API] Update error:", error);
    return NextResponse.json({ error: "Failed to update blog post" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Blog API] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete blog post" }, { status: 500 });
  }
}
