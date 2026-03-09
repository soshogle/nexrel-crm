import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { documentExtractor } from "@/lib/document-extractor";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const { url, category } = await request.json();

    if (!url) {
      return apiErrors.badRequest("URL is required");
    }

    // Extract text from URL
    const extracted = await documentExtractor.extractFromURL(url);

    if (!extracted.success) {
      return apiErrors.badRequest(
        extracted.error || "Failed to extract content from URL",
      );
    }

    // Save to knowledge base
    const entry = await db.knowledgeBase.create({
      data: {
        userId: session.user.id,
        category: category || "website",
        title: `Website: ${url}`,
        content: extracted.text,
        tags: JSON.stringify(["website", "scraped"]),
        priority: 5,
      },
    });

    return NextResponse.json({
      success: true,
      entry,
      metadata: extracted.metadata,
    });
  } catch (error: any) {
    console.error("URL scrape error:", error);
    return apiErrors.internal(error.message || "Failed to scrape URL");
  }
}
