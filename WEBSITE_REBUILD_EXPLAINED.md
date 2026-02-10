# 🔍 Website Rebuild Process - How It Works

## Overview

When you select a website to rebuild, the system extracts content, SEO data, structure, and references to images/videos from the source website. Here's exactly what gets extracted and how:

---

## ✅ What Gets Extracted

### 1. **SEO Data & Meta Tags** ✅ FULLY EXTRACTED

The scraper extracts **all SEO metadata**:

- **Page Title** (`<title>` tag)
- **Meta Description** (`<meta name="description">`)
- **Meta Keywords** (`<meta name="keywords">`)
- **Open Graph Tags:**
  - `og:title`
  - `og:description`
  - `og:image`
- **Twitter Card** (`twitter:card`)
- **Canonical URL** (`<link rel="canonical">`)
- **All other meta tags** (stored in metadata object)

**Example extracted:**
```json
{
  "title": "My Business Website",
  "description": "We provide amazing services...",
  "keywords": ["service", "business", "quality"],
  "ogTitle": "My Business Website",
  "ogDescription": "We provide amazing services...",
  "ogImage": "https://example.com/image.jpg",
  "twitterCard": "summary_large_image",
  "canonicalUrl": "https://example.com/"
}
```

---

### 2. **Images** ⚠️ URLS EXTRACTED (NOT DOWNLOADED)

**What gets extracted:**
- All `<img>` tags with their `src` URLs
- `alt` text for each image
- Background images from CSS (`background-image: url(...)`)
- All image URLs are converted to absolute URLs

**What does NOT happen:**
- ❌ Images are **NOT downloaded** to your server
- ❌ Images are **NOT stored** in cloud storage
- ❌ Images are **NOT copied** locally

**How it works:**
- Image URLs are extracted and stored as references
- The rebuilt website will reference the **original image URLs**
- If the original website removes images, they'll break in your rebuilt site

**Example extracted:**
```json
{
  "images": [
    {
      "url": "https://example.com/logo.png",
      "alt": "Company Logo"
    },
    {
      "url": "https://example.com/hero-image.jpg",
      "alt": "Hero Section"
    }
  ]
}
```

---

### 3. **Videos** ⚠️ EMBED CODES EXTRACTED (NOT DOWNLOADED)

**What gets extracted:**
- **YouTube embeds** (`youtube.com/embed/...`)
- **YouTube short URLs** (`youtu.be/...`)
- **Vimeo embeds** (`vimeo.com/...`)
- **Direct video files** (`<video src="...">`)

**What does NOT happen:**
- ❌ Videos are **NOT downloaded**
- ❌ Videos are **NOT converted** or stored
- ❌ Only embed codes/URLs are extracted

**How it works:**
- Video embed codes are extracted (e.g., YouTube video ID)
- The rebuilt website will use the same embed codes
- Videos continue to play from their original sources (YouTube, Vimeo, etc.)

**Example extracted:**
```json
{
  "videos": [
    {
      "url": "https://www.youtube.com/watch?v=abc123",
      "type": "youtube",
      "embedId": "abc123"
    },
    {
      "url": "https://vimeo.com/123456",
      "type": "vimeo",
      "embedId": "123456"
    }
  ]
}
```

---

### 4. **Content & Structure** ✅ FULLY EXTRACTED

**What gets extracted:**
- **HTML structure** (header, main, footer, navigation)
- **Text content** from all pages
- **Forms** (with fields, actions, methods)
- **Navigation menus**
- **Page structure** (sections, components)

**Example extracted:**
```json
{
  "structure": {
    "header": "<header>...</header>",
    "main": "<main>...</main>",
    "footer": "<footer>...</footer>",
    "navigation": "<nav>...</nav>"
  },
  "forms": [
    {
      "id": "contact-form",
      "action": "/contact",
      "method": "POST",
      "fields": [
        { "name": "email", "type": "email", "required": true },
        { "name": "message", "type": "textarea" }
      ]
    }
  ]
}
```

---

### 5. **Styles & Design** ✅ PARTIALLY EXTRACTED

**What gets extracted:**
- **Colors** (from CSS: `color`, `background-color`, `border-color`)
- **Fonts** (from CSS: `font-family`)
- **Layout patterns** (responsive, etc.)

**Limitations:**
- ⚠️ Only extracts colors/fonts from inline styles and `<style>` tags
- ⚠️ Does NOT extract from external CSS files
- ⚠️ Does NOT extract complex CSS animations or transitions

**Example extracted:**
```json
{
  "styles": {
    "colors": ["#FF5733", "#33FF57", "#3357FF"],
    "fonts": ["Arial", "Helvetica", "sans-serif"],
    "layout": "responsive"
  }
}
```

---

### 6. **Products (E-commerce)** ⚠️ BASIC DETECTION ONLY

**What gets extracted:**
- Basic detection if site has products (checks for "product", "shop", "cart" keywords)
- Product structure extraction is **limited** (marked as TODO in code)

**Limitations:**
- ⚠️ Does NOT extract product details (name, price, description)
- ⚠️ Does NOT extract product images
- ⚠️ Does NOT parse schema.org Product markup (planned but not implemented)

---

## 🔄 How the Rebuild Process Works

### Step 1: Scraping (Extraction)
```
User enters URL → Scraper fetches HTML → Extracts all data
```

1. **Fetch HTML** from source URL
2. **Parse HTML** to extract:
   - SEO metadata
   - Image URLs
   - Video embed codes
   - Forms
   - Structure
   - Styles
   - Content

### Step 2: Data Storage
```
Extracted data → Stored in database → Saved as JSON structure
```

- All extracted data is stored in the `Website` table
- `extractedData` field contains the full scraped data
- `structure` field contains the converted website structure
- `seoData` field contains SEO information

### Step 3: Website Building
```
Stored data → Converted to Next.js structure → Deployed to Vercel
```

- Scraped data is converted to Next.js components
- Images/videos reference original URLs
- SEO data is applied to pages
- Website is built and deployed

---

## ⚠️ Important Limitations

### 1. **JavaScript-Rendered Content**
- **Current:** Uses simple `fetch()` - only gets static HTML
- **Limitation:** Content loaded via JavaScript **won't be extracted**
- **Future:** TODO mentions adding Puppeteer/Playwright for JavaScript rendering

### 2. **Images & Videos**
- **Current:** Only URLs are extracted, not actual files
- **Risk:** If original website removes images, they'll break
- **Solution:** Consider downloading and hosting images yourself (not currently implemented)

### 3. **External CSS Files**
- **Current:** Only extracts styles from inline CSS and `<style>` tags
- **Limitation:** External CSS files are not parsed
- **Impact:** Some styling may be lost

### 4. **Multi-Page Websites**
- **Current:** Only scrapes the single URL you provide
- **Limitation:** Does NOT crawl entire website automatically
- **Solution:** You'd need to rebuild each page separately

### 5. **Authentication/Protected Content**
- **Current:** Cannot access password-protected or login-required pages
- **Limitation:** Only public content is accessible

---

## 📊 Summary: What Gets Extracted vs. What Doesn't

| Content Type | Extracted? | Downloaded? | Notes |
|-------------|------------|-------------|-------|
| **SEO/Meta Tags** | ✅ Yes | N/A | All meta tags extracted |
| **Page Title** | ✅ Yes | N/A | From `<title>` tag |
| **Meta Description** | ✅ Yes | N/A | Full description |
| **Open Graph** | ✅ Yes | N/A | og:title, og:description, og:image |
| **Twitter Card** | ✅ Yes | N/A | Twitter metadata |
| **Text Content** | ✅ Yes | N/A | All visible text |
| **HTML Structure** | ✅ Yes | N/A | Header, main, footer, nav |
| **Forms** | ✅ Yes | N/A | Fields, actions, methods |
| **Image URLs** | ✅ Yes | ❌ No | URLs only, not files |
| **Video Embeds** | ✅ Yes | ❌ No | Embed codes only |
| **Colors** | ✅ Partial | N/A | From inline styles only |
| **Fonts** | ✅ Partial | N/A | From inline styles only |
| **External CSS** | ❌ No | N/A | Not parsed |
| **JavaScript Content** | ❌ No | N/A | Not rendered |
| **Products** | ⚠️ Basic | N/A | Detection only |

---

## 🎯 Best Practices

### For Best Results:

1. **Provide a complete URL** - Make sure the page is publicly accessible
2. **Check image URLs** - After rebuild, verify images still load
3. **Test forms** - Forms are extracted but may need backend setup
4. **Review SEO** - All meta tags are copied, but verify they're correct
5. **Consider hosting images** - If you want independence, download and host images yourself

### What Works Well:

- ✅ Static websites
- ✅ Simple HTML/CSS sites
- ✅ Sites with clear structure
- ✅ Public content

### What May Need Manual Work:

- ⚠️ JavaScript-heavy sites (may miss content)
- ⚠️ Sites with external CSS (styling may be incomplete)
- ⚠️ Multi-page sites (need to rebuild each page)
- ⚠️ Sites with protected content (won't be accessible)

---

## 🔮 Future Enhancements (Not Yet Implemented)

Based on the code comments, these features are planned:

1. **JavaScript Rendering** - Add Puppeteer/Playwright support
2. **Image Download** - Download and host images locally/cloud
3. **Product Extraction** - Parse schema.org Product markup
4. **Multi-Page Crawling** - Automatically crawl entire websites
5. **External CSS Parsing** - Extract styles from external CSS files

---

## 📝 Code References

- **Scraper:** `lib/website-builder/scraper.ts`
- **Builder:** `lib/website-builder/builder.ts`
- **Types:** `lib/website-builder/types.ts`
- **API Route:** `app/api/website-builder/create/route.ts`
