# JS Scraping on Vercel (Playwright + @sparticuz/chromium)

This guide explains how to enable JavaScript-rendered website scraping on Vercel using Playwright with `@sparticuz/chromium`.

## Why @sparticuz/chromium?

Vercel serverless functions run in a restricted environment. The standard Playwright Chromium binary is too large and not compatible with serverless. `@sparticuz/chromium` provides a compressed Chromium binary designed for AWS Lambda, Vercel, and similar platforms.

---

## Step-by-Step Setup

### 1. Add environment variable

In your `.env` (local) and **Vercel Project Settings → Environment Variables**:

```
ENABLE_JS_SCRAPING=true
```

This enables Playwright-based scraping for JS-rendered sites (React, SPAs, etc.).

---

### 2. Install dependencies

Already done in this project:

```bash
npm install playwright @sparticuz/chromium@131
```

**Version compatibility:** Use `@sparticuz/chromium@131` with Playwright 1.57–1.58. Check [Playwright Chromium Support](https://pptr.dev/chromium-support) and [@sparticuz/chromium releases](https://github.com/Sparticuz/chromium/releases) when upgrading.

---

### 3. Increase function memory and duration (Vercel)

In **Vercel Dashboard → Project → Settings → Functions**:

- **Memory:** Set to **1024 MB** (minimum recommended) or **1600 MB** for heavier pages
- **Max Duration:** Set to **30 seconds** (or higher if needed)

Or in `vercel.json`:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

---

### 4. Optional: Reduce bundle size with @sparticuz/chromium-min

If your deployment hits size limits (~50 MB for the Chromium binary):

1. Install the minimal package:
   ```bash
   npm install @sparticuz/chromium-min@131
   ```

2. Host the Chromium pack (e.g. on S3 or a CDN) and pass the URL:
   ```ts
   executablePath: await chromium.executablePath('https://your-cdn.com/chromium-pack.tar')
   ```

3. Update the scraper to use `@sparticuz/chromium-min` when that package is used.

---

### 5. Verify it works

1. Deploy to Vercel.
2. Trigger a website rebuild that scrapes a JS-rendered site (e.g. a React SPA).
3. Check Vercel function logs for any Playwright/Chromium errors.

---

## How it works in this project

- **Local:** Uses Playwright’s bundled Chromium.
- **Vercel:** Uses `@sparticuz/chromium` when `process.env.VERCEL` is set.
- **Fallback:** If Playwright fails, the scraper falls back to `fetch()` (no JS rendering).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Timeout / function killed | Increase `maxDuration` and `memory` in Vercel |
| "Executable doesn't exist" | Ensure `@sparticuz/chromium` is a **production** dependency, not dev |
| Cold start slow | First run extracts Chromium to `/tmp`; subsequent runs are faster |
| Version mismatch | Align `@sparticuz/chromium` version with Playwright’s Chromium (see compatibility table) |

---

## References

- [@sparticuz/chromium GitHub](https://github.com/Sparticuz/chromium)
- [Playwright with @sparticuz/chromium example](https://github.com/Sparticuz/chromium#usage-with-playwright)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
