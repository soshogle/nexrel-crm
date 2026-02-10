# 🖼️ Image Storage Setup Guide

## Quick Start

### Step 1: Install Dependencies

```bash
npm install @vercel/blob sharp
```

**Note:** `sharp` is used for image optimization (WebP conversion, resizing)

---

### Step 2: Choose Storage Provider

#### Option A: Vercel Blob (Recommended)

1. **Get Vercel Blob Token:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Or visit: https://vercel.com/docs/storage/vercel-blob/quickstart

2. **Add Environment Variable:**
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
   IMAGE_STORAGE_PROVIDER=vercel
   ENABLE_IMAGE_DOWNLOAD=true
   ```

#### Option B: Cloudflare R2 (Cheapest)

1. **Create R2 Bucket:**
   - Go to Cloudflare Dashboard → R2 → Create Bucket
   - Get your Account ID, Access Key ID, and Secret Access Key

2. **Add Environment Variables:**
   ```env
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
   CLOUDFLARE_R2_BUCKET=your_bucket_name
   CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
   IMAGE_STORAGE_PROVIDER=r2
   ENABLE_IMAGE_DOWNLOAD=true
   ```

#### Option C: AWS S3 (Already Configured)

1. **Use Existing AWS Credentials:**
   ```env
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your_bucket_name
   IMAGE_STORAGE_PROVIDER=s3
   ENABLE_IMAGE_DOWNLOAD=true
   ```

---

### Step 3: Enable Image Downloading

Set environment variable:
```env
ENABLE_IMAGE_DOWNLOAD=true
```

**What this does:**
- When rebuilding a website, images will be downloaded and stored
- Original URLs will be replaced with stored URLs
- Optimized WebP versions will be created automatically
- Thumbnails will be generated

---

### Step 4: Test It

1. **Rebuild a website** with images
2. **Check the database** - `extractedData.images` should have stored URLs
3. **Verify images load** from your storage provider

---

## How It Works

### When Rebuilding a Website:

1. **Scraper extracts** image URLs from source website
2. **Image Storage Service** downloads each image
3. **Images are uploaded** to your chosen storage provider
4. **Optimized versions** are created (WebP, resized)
5. **Thumbnails** are generated
6. **Original URLs** are replaced with stored URLs in website structure

### Storage Path Structure:

```
website-images/
  ├── {userId}/
  │   ├── {websiteId}/
  │   │   ├── original/        # Original images
  │   │   ├── optimized/       # WebP optimized versions
  │   │   └── thumbnails/      # Thumbnail versions
```

---

## Cost Comparison

### Scenario: 100 websites, 50 images each (5,000 images)

| Provider | Storage Cost | Bandwidth Cost | Total/Month |
|----------|-------------|----------------|-------------|
| **Vercel Blob** | $0.15 | $4.00 | **~$4.15** |
| **Cloudflare R2** | $0.015 | FREE | **~$0.015** |
| **AWS S3** | $0.023 | $0.90 | **~$0.96** |

**Recommendation:** Use Cloudflare R2 for lowest cost, or Vercel Blob for easiest setup.

---

## Features

✅ **Automatic Image Optimization**
- Converts to WebP format
- Resizes large images (max 1920x1080)
- Reduces file size by ~70%

✅ **Thumbnail Generation**
- Creates 300x300 thumbnails
- Perfect for galleries and previews

✅ **Multi-Tenant Isolation**
- Each user's images are isolated
- Easy cleanup when website deleted

✅ **Error Handling**
- Continues if individual images fail
- Falls back to original URLs if storage fails

---

## Cleanup

When a website is deleted, images are automatically cleaned up:

```typescript
import { WebsiteImageStorage } from '@/lib/website-builder/image-storage';

const imageStorage = new WebsiteImageStorage({
  provider: 'vercel', // or 's3', 'r2'
  userId: 'user-id',
  websiteId: 'website-id',
});

await imageStorage.deleteWebsiteImages();
```

---

## Troubleshooting

### Images Not Downloading?

1. **Check environment variables:**
   ```bash
   echo $ENABLE_IMAGE_DOWNLOAD
   echo $IMAGE_STORAGE_PROVIDER
   ```

2. **Check storage credentials:**
   - Vercel: Verify `BLOB_READ_WRITE_TOKEN`
   - R2: Verify Cloudflare credentials
   - S3: Verify AWS credentials

3. **Check logs:**
   - Look for "Failed to store image" warnings
   - Check if storage provider is accessible

### Images Too Large?

- Images are automatically optimized (max 1920x1080)
- WebP conversion reduces size by ~70%
- Adjust `maxWidth`/`maxHeight` in scraper if needed

### Storage Costs Too High?

- Switch to Cloudflare R2 (almost free)
- Or disable image downloading (`ENABLE_IMAGE_DOWNLOAD=false`)
- Images will use original URLs (no storage cost)

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Choose storage provider
3. ✅ Set environment variables
4. ✅ Enable image downloading
5. ✅ Test with a website rebuild
6. ✅ Monitor storage costs

---

## Code Examples

### Manual Image Storage

```typescript
import { WebsiteImageStorage } from '@/lib/website-builder/image-storage';

const storage = new WebsiteImageStorage({
  provider: 'vercel',
  userId: 'user-123',
  websiteId: 'website-456',
});

// Download and store a single image
const stored = await storage.downloadAndStore(
  'https://example.com/image.jpg',
  'Alt text',
  {
    createOptimized: true,
    createThumbnail: true,
  }
);

console.log('Stored URL:', stored.url);
console.log('Optimized URL:', stored.optimizedUrl);
console.log('Thumbnail URL:', stored.thumbnailUrl);
```

### Check Stored Images

```typescript
// Images are stored in website.extractedData.images
const website = await prisma.website.findUnique({
  where: { id: websiteId },
});

const images = website?.extractedData?.images || [];
images.forEach(img => {
  console.log('Original:', img.originalUrl);
  console.log('Stored:', img.url);
  console.log('Optimized:', img.optimizedUrl);
});
```
