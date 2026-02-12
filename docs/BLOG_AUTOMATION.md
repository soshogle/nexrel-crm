# Soshogle AI Blog Automation

Automated daily blog posts for the landing page (nexrel.soshogle.com), designed for social sharing (LinkedIn, Instagram).

## Overview

- **2 posts per day** at 9am and 3pm (UTC)
- **Format**: Industry problem → Soshogle AI solution
- **Images**: AI-generated for problems (optional DALL-E), screenshots for solutions

## Setup

### 1. Run Migration

```bash
npm run migrate:dev -- --name add_blog_post
# or
tsx scripts/migrate-with-backup.ts dev --name add_blog_post
```

### 2. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | For content generation |
| `DATABASE_URL` | Yes | PostgreSQL (Neon) |
| `CRON_SECRET` | Yes (prod) | Secures cron endpoint |
| `BLOG_ENABLE_DALLE` | No | Set to `true` to generate problem images (DALL-E; adds cost) |
| `BLOB_READ_WRITE_TOKEN` | If DALL-E | Vercel Blob for storing generated images |

### 3. Vercel Cron

The cron is in `vercel.json`. Ensure `CRON_SECRET` is set in Vercel env. The job runs at:
- `0 9 * * *` — 9:00 UTC
- `0 15 * * *` — 15:00 UTC

### 4. Solution Screenshots

Replace placeholder images in `lib/blog-generator.ts`:

1. Add Nexrel screenshots to `/public/blog-screenshots/`
2. Update `SOLUTION_SCREENSHOTS` in `lib/blog-generator.ts` with paths like `/blog-screenshots/nexrel-dashboard.png`

## Manual Testing

Generate a single post:

```bash
tsx scripts/generate-blog-post.ts
```

Trigger cron manually (local):

```bash
curl -X POST http://localhost:3000/api/cron/blog-generator \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Routes

- `/blog` — List of posts
- `/blog/[slug]` — Single post
- `/api/blog` — List API
- `/api/blog/[slug]` — Single post API

## Industries Covered

Healthcare, E-commerce, Real Estate, Restaurants, Professional Services, Retail, Fitness, Automotive, Dental, Salons & Spas, Insurance, Property Management.

## Content

All content uses **"Soshogle AI"** (not just "AI") in copy. Posts are saved with:
- Title, excerpt, full markdown content
- Category (e.g. Industry Insights)
- Industry
- Problem image URL (if DALL-E enabled)
- Solution image URL (screenshot path)
