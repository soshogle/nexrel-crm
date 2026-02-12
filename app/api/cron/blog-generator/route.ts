/**
 * Cron Job: Soshogle AI Blog Generator
 * Creates 2 blog posts per day for the landing page
 * POST /api/cron/blog-generator
 *
 * Schedule in vercel.json: 0 9,15 * * * (9am and 3pm daily)
 * Set CRON_SECRET in Vercel env
 */

import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/blog-generator";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📝 [Cron] Starting Soshogle AI blog generation (2 posts)...");

    const [r1, r2] = await Promise.all([
      generateBlogPost(),
      generateBlogPost(),
    ]);

    const created: string[] = [];
    if (r1.success && r1.post) created.push(r1.post.slug);
    else console.warn("[Cron] Post 1 failed:", r1.error);
    if (r2.success && r2.post) created.push(r2.post.slug);
    else console.warn("[Cron] Post 2 failed:", r2.error);

    console.log(`✅ [Cron] Blog generation done. Created: ${created.join(", ") || "none"}`);

    return NextResponse.json({
      success: true,
      created,
      errors: [r1.error, r2.error].filter(Boolean),
    });
  } catch (error: unknown) {
    console.error("❌ [Cron] Blog generator error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Blog generation failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
