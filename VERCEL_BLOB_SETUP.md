# 🚀 Vercel Blob Setup Guide

## Step 1: Get Your Vercel Blob Token

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Sign in to your account

2. **Navigate to Storage:**
   - Click on your project (or create one)
   - Go to **Storage** tab in the left sidebar
   - Click **"Create Database"** or **"Add Storage"**

3. **Select Blob Storage:**
   - Choose **"Blob"** from the storage options
   - Click **"Create"**

4. **Get Your Token:**
   - After creating, you'll see your Blob storage
   - Click on it to view details
   - Copy the **"BLOB_READ_WRITE_TOKEN"** (starts with `vercel_blob_rw_`)

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Create Blob storage
vercel blob create

# Get your token
vercel env pull .env.local
```

The token will be in `.env.local` as `BLOB_READ_WRITE_TOKEN`.

---

## Step 2: Add Environment Variables

### For Local Development:

1. **Add to `.env.local`:**
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx
   IMAGE_STORAGE_PROVIDER=vercel
   ENABLE_IMAGE_DOWNLOAD=true
   ```

2. **Or add to `.env`:**
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx
   IMAGE_STORAGE_PROVIDER=vercel
   ENABLE_IMAGE_DOWNLOAD=true
   ```

### For Vercel Production:

1. **Go to Vercel Dashboard:**
   - Your Project → Settings → Environment Variables

2. **Add these variables:**
   - `BLOB_READ_WRITE_TOKEN` = `vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx`
   - `IMAGE_STORAGE_PROVIDER` = `vercel`
   - `ENABLE_IMAGE_DOWNLOAD` = `true`

3. **Select environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional)

4. **Click "Save"**

---

## Step 3: Verify Setup

### Test Image Storage:

Create a test file `test-blob.ts`:

```typescript
import { put } from '@vercel/blob';

async function testBlob() {
  try {
    const blob = await put('test/test-image.jpg', Buffer.from('test'), {
      access: 'public',
      contentType: 'image/jpeg',
    });
    
    console.log('✅ Blob storage working!');
    console.log('URL:', blob.url);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Make sure BLOB_READ_WRITE_TOKEN is set in environment variables');
  }
}

testBlob();
```

Run it:
```bash
npx tsx test-blob.ts
```

---

## Step 4: Test Website Rebuild with Images

1. **Go to:** `/dashboard/websites/new`
2. **Select:** "Rebuild Existing Website"
3. **Enter a URL** with images (e.g., `https://example.com`)
4. **Click "Build Website"**
5. **Check the build progress** - images should be downloaded and stored

### Verify Images Were Stored:

1. **Check database:**
   ```sql
   SELECT 
     id,
     name,
     jsonb_extract_path_text(extracted_data, 'images') as images
   FROM "Website"
   WHERE "extractedData" IS NOT NULL
   ORDER BY "createdAt" DESC
   LIMIT 1;
   ```

2. **Check Vercel Dashboard:**
   - Go to Storage → Blob
   - You should see folders: `website-images/{userId}/{websiteId}/`

---

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is not set"

**Solution:**
- Make sure you've added `BLOB_READ_WRITE_TOKEN` to your `.env.local` or `.env` file
- Restart your development server after adding the variable
- For production, add it to Vercel environment variables

### Error: "Invalid token"

**Solution:**
- Verify your token starts with `vercel_blob_rw_`
- Make sure you copied the entire token (no spaces)
- Regenerate token in Vercel Dashboard if needed

### Images Not Downloading

**Check:**
1. `ENABLE_IMAGE_DOWNLOAD=true` is set
2. `IMAGE_STORAGE_PROVIDER=vercel` is set
3. `BLOB_READ_WRITE_TOKEN` is valid
4. Check server logs for errors

### Images Still Using Original URLs

**Possible reasons:**
1. Image download is disabled (`ENABLE_IMAGE_DOWNLOAD=false`)
2. Storage failed (check logs)
3. Images were scraped before enabling download

**Solution:**
- Rebuild the website after enabling image download
- Check server logs for storage errors

---

## Cost Information

### Vercel Blob Pricing:

- **Free Tier:**
  - 1GB storage
  - 100GB bandwidth/month

- **Paid:**
  - Storage: $0.15/GB/month
  - Bandwidth: $0.40/GB

### Example Costs:

**Small site (50 images, ~10MB):**
- Storage: ~$0.0015/month
- Bandwidth: ~$0.04/month (10GB)
- **Total: ~$0.04/month**

**100 sites (5,000 images, ~1GB):**
- Storage: $0.15/month
- Bandwidth: $4/month (10GB)
- **Total: ~$4.15/month**

---

## Next Steps

1. ✅ Install `@vercel/blob` package (done)
2. ✅ Get Vercel Blob token
3. ✅ Add environment variables
4. ✅ Test image storage
5. ✅ Rebuild a website to test end-to-end

---

## Quick Reference

### Environment Variables:
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
IMAGE_STORAGE_PROVIDER=vercel
ENABLE_IMAGE_DOWNLOAD=true
```

### Storage Path Structure:
```
website-images/
  ├── {userId}/
  │   ├── {websiteId}/
  │   │   ├── original/        # Original images
  │   │   ├── optimized/      # WebP optimized
  │   │   └── thumbnails/     # Thumbnails
```

### Code Usage:
```typescript
import { WebsiteImageStorage } from '@/lib/website-builder/image-storage';

const storage = new WebsiteImageStorage({
  provider: 'vercel',
  userId: 'user-123',
  websiteId: 'website-456',
});

const stored = await storage.downloadAndStore(
  'https://example.com/image.jpg',
  'Alt text'
);
```

---

## Support

If you encounter issues:
1. Check Vercel Blob docs: https://vercel.com/docs/storage/vercel-blob
2. Check server logs for detailed error messages
3. Verify all environment variables are set correctly
