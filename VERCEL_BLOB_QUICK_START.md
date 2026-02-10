# ⚡ Vercel Blob Quick Start

## ✅ What's Already Done

1. ✅ **Package installed:** `@vercel/blob` 
2. ✅ **Image storage service created:** `lib/website-builder/image-storage.ts`
3. ✅ **Scraper updated:** Automatically downloads images when enabled
4. ✅ **API route updated:** Passes credentials to scraper
5. ✅ **Test script created:** `scripts/test-vercel-blob.ts`

---

## 🚀 Next Steps (5 Minutes)

### Step 1: Get Your Vercel Blob Token

1. **Go to:** https://vercel.com/dashboard
2. **Select your project** (or create one)
3. **Click:** Storage → Create Database → Blob
4. **Copy the token** (starts with `vercel_blob_rw_`)

### Step 2: Add to Environment Variables

**For local development** (`.env.local` or `.env`):
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx
IMAGE_STORAGE_PROVIDER=vercel
ENABLE_IMAGE_DOWNLOAD=true
```

**For Vercel production:**
1. Go to: Project → Settings → Environment Variables
2. Add all three variables above
3. Select: Production, Preview, Development
4. Click Save

### Step 3: Test It

```bash
npx tsx scripts/test-vercel-blob.ts
```

You should see:
```
✅ All tests passed! Vercel Blob is configured correctly.
```

### Step 4: Test with a Website Rebuild

1. Go to: `/dashboard/websites/new`
2. Select: "Rebuild Existing Website"
3. Enter a URL with images
4. Click "Build Website"
5. Images will be automatically downloaded and stored!

---

## 📋 Environment Variables Checklist

Make sure these are set:

- [ ] `BLOB_READ_WRITE_TOKEN` - Your Vercel Blob token
- [ ] `IMAGE_STORAGE_PROVIDER=vercel` - Use Vercel Blob
- [ ] `ENABLE_IMAGE_DOWNLOAD=true` - Enable image downloading

---

## 🧪 Test Commands

### Test Blob Storage:
```bash
npx tsx scripts/test-vercel-blob.ts
```

### Test Image Storage Service:
```typescript
import { WebsiteImageStorage } from '@/lib/website-builder/image-storage';

const storage = new WebsiteImageStorage({
  provider: 'vercel',
  userId: 'test-user',
  websiteId: 'test-website',
});

const stored = await storage.downloadAndStore(
  'https://example.com/image.jpg',
  'Test image'
);

console.log('Stored URL:', stored.url);
```

---

## 📁 Where Images Are Stored

In Vercel Dashboard → Storage → Blob:
```
website-images/
  ├── {userId}/
  │   ├── {websiteId}/
  │   │   ├── original/        # Original images
  │   │   ├── optimized/       # WebP optimized versions
  │   │   └── thumbnails/      # 300x300 thumbnails
```

---

## 💰 Cost

**Free Tier:**
- 1GB storage
- 100GB bandwidth/month

**Paid:**
- Storage: $0.15/GB/month
- Bandwidth: $0.40/GB

**Example:** 100 websites with 50 images each (~1GB) = **~$4.15/month**

---

## ❓ Troubleshooting

### "BLOB_READ_WRITE_TOKEN is not set"
→ Add it to your `.env.local` file and restart your dev server

### "Invalid token"
→ Regenerate token in Vercel Dashboard

### Images not downloading
→ Check `ENABLE_IMAGE_DOWNLOAD=true` is set

### See full guide:
→ `VERCEL_BLOB_SETUP.md`

---

## 📚 Documentation

- **Setup Guide:** `VERCEL_BLOB_SETUP.md`
- **Architecture:** `WEBSITE_IMAGE_STORAGE_ARCHITECTURE.md`
- **Image Storage Service:** `lib/website-builder/image-storage.ts`

---

## ✅ You're Ready!

Once you've:
1. ✅ Got your token
2. ✅ Added environment variables
3. ✅ Tested with the script

You can start rebuilding websites and images will be automatically downloaded and stored! 🎉
