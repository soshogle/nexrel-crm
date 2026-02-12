#!/usr/bin/env tsx
/**
 * Manual script to generate a single blog post (for testing)
 * Usage: tsx scripts/generate-blog-post.ts
 *
 * Requires: OPENAI_API_KEY, DATABASE_URL
 * Optional: BLOG_ENABLE_DALLE=true to generate problem images via DALL-E
 */

import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { generateBlogPost } from "../lib/blog-generator";

async function main() {
  console.log("📝 Generating Soshogle AI blog post...\n");
  const result = await generateBlogPost();
  if (result.success && result.post) {
    console.log("✅ Post created:", result.post.slug);
    console.log(`   View at: /blog/${result.post.slug}`);
  } else {
    console.error("❌ Failed:", result.error);
    process.exit(1);
  }
}

main();
