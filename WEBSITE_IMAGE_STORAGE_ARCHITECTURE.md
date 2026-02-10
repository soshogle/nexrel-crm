# 🖼️ Website Image Storage Architecture - Multi-Tenant System

## ❌ Why NOT GitHub for Image Storage?

### GitHub Limitations:
1. **File Size Limits:**
   - Max 100MB per file
   - Max 1GB per repository (free tier)
   - Large images will fail

2. **Not Designed for CDN:**
   - GitHub doesn't serve files as a CDN
   - No image optimization
   - Slow delivery (not optimized for images)

3. **Rate Limits:**
   - API rate limits (5000 requests/hour)
   - Not suitable for high-traffic image serving

4. **Cost:**
   - GitHub LFS (Large File Storage) costs $5/month for 50GB
   - More expensive than dedicated storage solutions

5. **No Image Processing:**
   - No automatic resizing/optimization
   - No thumbnail generation
   - No format conversion

---

## ✅ Best Storage Options for Multi-Tenant System

### Option 1: **Vercel Blob Storage** ⭐ RECOMMENDED

**Why it's perfect for your setup:**
- ✅ **Already using Vercel** for deployment
- ✅ **Built-in CDN** (Cloudflare edge network)
- ✅ **Automatic optimization** (WebP conversion, resizing)
- ✅ **Simple API** (no AWS credentials needed)
- ✅ **Multi-tenant ready** (path-based isolation)
- ✅ **Free tier:** 1GB storage, 100GB bandwidth/month
- ✅ **Paid:** $0.15/GB storage, $0.40/GB bandwidth

**Cost Example:**
- 100 websites × 50 images each = 5,000 images
- Average 200KB/image = 1GB storage
- **Cost:** $0.15/month (or free if under 1GB)

**Architecture:**
```
website-images/
  ├── {userId}/
  │   ├── {websiteId}/
  │   │   ├── original/
  │   │   │   ├── image-1.jpg
  │   │   │   └── image-2.png
  │   │   ├── optimized/
  │   │   │   ├── image-1.webp
  │   │   │   └── image-2.webp
  │   │   └── thumbnails/
  │   │       ├── image-1-thumb.jpg
  │   │       └── image-2-thumb.jpg
```

---

### Option 2: **Cloudflare R2** ⭐ BEST VALUE

**Why it's excellent:**
- ✅ **No egress fees** (unlimited bandwidth)
- ✅ **S3-compatible API** (easy migration)
- ✅ **Global CDN** (Cloudflare network)
- ✅ **Very cheap:** $0.015/GB storage
- ✅ **Multi-tenant ready**

**Cost Example:**
- 1GB storage = $0.015/month
- Unlimited bandwidth = $0/month
- **Total:** $0.015/month (extremely cheap!)

**Architecture:** Same as S3 (path-based)

---

### Option 3: **AWS S3** (You Already Have This!)

**Why it works:**
- ✅ **Already implemented** in your codebase (`CloudImageStorageService`)
- ✅ **Proven multi-tenant** architecture
- ✅ **Reliable** and scalable
- ✅ **CDN integration** (CloudFront)

**Cost:**
- Storage: $0.023/GB/month
- Bandwidth: $0.09/GB (first 10TB)
- Requests: $0.0004 per 1,000 requests

**Architecture:** Already using this for DICOM files

---

### Option 4: **Vercel + Next.js Image Optimization**

**Why it's smart:**
- ✅ **Built into Next.js** (you're using Next.js)
- ✅ **Automatic optimization** (WebP, AVIF, resizing)
- ✅ **CDN caching** (Vercel Edge Network)
- ✅ **Zero config** for images in `public/` folder

**Limitation:**
- Images must be in repository (increases repo size)
- Better for small sites, not ideal for multi-tenant

---

## 🏗️ Recommended Architecture: Vercel Blob + Multi-Tenant Paths

### Path Structure:
```
website-images/
  ├── {userId}/                    # User isolation
  │   ├── {websiteId}/             # Website isolation
  │   │   ├── original/            # Original images
  │   │   │   ├── {hash}-{filename}
  │   │   ├── optimized/           # Optimized versions
  │   │   │   ├── {hash}-{filename}.webp
  │   │   └── thumbnails/          # Thumbnails
  │   │       ├── {hash}-{filename}-thumb.webp
```

### Benefits:
1. **Complete isolation** - Each user's images are separate
2. **Easy cleanup** - Delete entire folder when website deleted
3. **Scalable** - No single folder gets too large
4. **Secure** - Path-based access control

---

## 📊 Comparison Table

| Feature | Vercel Blob | Cloudflare R2 | AWS S3 | GitHub |
|---------|-------------|---------------|--------|--------|
| **Storage Cost** | $0.15/GB | $0.015/GB | $0.023/GB | $5/50GB |
| **Bandwidth Cost** | $0.40/GB | FREE | $0.09/GB | N/A |
| **CDN Included** | ✅ Yes | ✅ Yes | ⚠️ Extra | ❌ No |
| **Auto Optimization** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **S3 Compatible** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| **Multi-Tenant Ready** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Limited |
| **Free Tier** | ✅ 1GB | ❌ No | ✅ 5GB | ⚠️ 1GB repo |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Best For** | Vercel users | Cost-conscious | Enterprise | Code only |

---

## 🎯 Recommended Solution: **Vercel Blob**

### Why Vercel Blob Wins:
1. **You're already on Vercel** - seamless integration
2. **Automatic optimization** - WebP conversion, resizing
3. **Built-in CDN** - fast global delivery
4. **Simple API** - no AWS credentials needed
5. **Multi-tenant ready** - path-based isolation
6. **Cost-effective** - free tier covers small sites

---

## 🔧 Implementation Plan

### Step 1: Install Vercel Blob SDK
```bash
npm install @vercel/blob
```

### Step 2: Set Environment Variables
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

### Step 3: Create Image Storage Service

**File:** `lib/website-builder/image-storage.ts`

```typescript
import { put, del, list } from '@vercel/blob';
import crypto from 'crypto';

export interface StoredImage {
  url: string;
  path: string;
  originalUrl: string;
  width?: number;
  height?: number;
  size: number;
  contentType: string;
}

export class WebsiteImageStorage {
  /**
   * Download and store image from URL
   */
  async downloadAndStore(
    imageUrl: string,
    userId: string,
    websiteId: string
  ): Promise<StoredImage> {
    // 1. Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // 2. Generate unique filename
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const extension = this.getExtension(contentType, imageUrl);
    const filename = `${hash}${extension}`;
    
    // 3. Create multi-tenant path
    const path = `website-images/${userId}/${websiteId}/original/${filename}`;
    
    // 4. Upload to Vercel Blob
    const blob = await put(path, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    
    // 5. Get image dimensions (optional)
    const dimensions = await this.getImageDimensions(buffer);
    
    return {
      url: blob.url,
      path: blob.pathname,
      originalUrl: imageUrl,
      width: dimensions.width,
      height: dimensions.height,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Create optimized version (WebP)
   */
  async createOptimizedVersion(
    originalPath: string,
    userId: string,
    websiteId: string
  ): Promise<string> {
    // Download original
    const originalBlob = await this.getBlob(originalPath);
    
    // Convert to WebP (using sharp or similar)
    const optimizedBuffer = await this.convertToWebP(originalBlob);
    
    // Upload optimized version
    const optimizedPath = originalPath.replace('/original/', '/optimized/').replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const blob = await put(optimizedPath, optimizedBuffer, {
      access: 'public',
      contentType: 'image/webp',
    });
    
    return blob.url;
  }

  /**
   * Create thumbnail
   */
  async createThumbnail(
    originalPath: string,
    userId: string,
    websiteId: string,
    maxWidth: number = 300,
    maxHeight: number = 300
  ): Promise<string> {
    // Download original
    const originalBlob = await this.getBlob(originalPath);
    
    // Resize to thumbnail
    const thumbnailBuffer = await this.resizeImage(originalBlob, maxWidth, maxHeight);
    
    // Upload thumbnail
    const thumbnailPath = originalPath.replace('/original/', '/thumbnails/').replace(/(\.[^.]+)$/, '-thumb$1');
    const blob = await put(thumbnailPath, thumbnailBuffer, {
      access: 'public',
      contentType: 'image/webp',
    });
    
    return blob.url;
  }

  /**
   * Delete all images for a website
   */
  async deleteWebsiteImages(userId: string, websiteId: string): Promise<void> {
    const prefix = `website-images/${userId}/${websiteId}/`;
    const blobs = await list({ prefix });
    
    // Delete all blobs
    await Promise.all(
      blobs.blobs.map(blob => del(blob.url))
    );
  }

  private getExtension(contentType: string, url: string): string {
    // Try content type first
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('gif')) return '.gif';
    if (contentType.includes('webp')) return '.webp';
    
    // Fallback to URL extension
    const urlMatch = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    return urlMatch ? `.${urlMatch[1]}` : '.jpg';
  }

  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    // Use sharp or jimp to get dimensions
    // Implementation depends on library choice
    return { width: 0, height: 0 }; // Placeholder
  }

  private async convertToWebP(buffer: Buffer): Promise<Buffer> {
    // Use sharp to convert to WebP
    // Implementation depends on library choice
    return buffer; // Placeholder
  }

  private async resizeImage(buffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> {
    // Use sharp to resize
    // Implementation depends on library choice
    return buffer; // Placeholder
  }

  private async getBlob(path: string): Promise<Buffer> {
    // Download blob from Vercel
    const response = await fetch(`https://blob.vercel-storage.com/${path}`);
    return Buffer.from(await response.arrayBuffer());
  }
}
```

### Step 4: Update Website Scraper

**Modify:** `lib/website-builder/scraper.ts`

```typescript
import { WebsiteImageStorage } from './image-storage';

export class WebsiteScraper {
  private imageStorage: WebsiteImageStorage;

  constructor() {
    this.imageStorage = new WebsiteImageStorage();
  }

  async scrapeWebsite(url: string, userId: string, websiteId: string): Promise<ScrapedWebsiteData> {
    // ... existing scraping code ...

    // Download and store images
    const storedImages = await Promise.all(
      images.map(img => 
        this.imageStorage.downloadAndStore(img.url, userId, websiteId)
          .catch(err => {
            console.error(`Failed to store image ${img.url}:`, err);
            return null; // Continue with other images
          })
      )
    );

    // Filter out failed downloads
    const successfulImages = storedImages.filter(img => img !== null);

    // Update image URLs to stored URLs
    return {
      ...scrapedData,
      images: successfulImages.map(stored => ({
        url: stored.url, // Use stored URL instead of original
        alt: images.find(img => img.url === stored.originalUrl)?.alt,
        stored: true,
        originalUrl: stored.originalUrl,
      })),
    };
  }
}
```

### Step 5: Update Database Schema

**Add to `Website` model:**
```prisma
model Website {
  // ... existing fields ...
  
  storedImages     Json?  // Array of stored image metadata
  imageStoragePath String? // Base path for images
}
```

---

## 🚀 Implementation Steps Summary

1. **Install dependencies:**
   ```bash
   npm install @vercel/blob sharp
   ```

2. **Set up Vercel Blob:**
   - Get token from Vercel dashboard
   - Add to environment variables

3. **Create image storage service:**
   - Download images from URLs
   - Upload to Vercel Blob
   - Generate optimized versions
   - Create thumbnails

4. **Update scraper:**
   - Integrate image storage
   - Replace original URLs with stored URLs

5. **Update builder:**
   - Use stored image URLs in website structure

6. **Add cleanup:**
   - Delete images when website is deleted

---

## 💰 Cost Estimation

### Scenario: 100 websites, 50 images each

**Vercel Blob:**
- Storage: 5,000 images × 200KB = 1GB = **$0.15/month**
- Bandwidth: 10GB/month = **$4/month**
- **Total: ~$4.15/month**

**Cloudflare R2:**
- Storage: 1GB = **$0.015/month**
- Bandwidth: Unlimited = **$0/month**
- **Total: ~$0.015/month** (extremely cheap!)

**AWS S3:**
- Storage: 1GB = **$0.023/month**
- Bandwidth: 10GB = **$0.90/month**
- Requests: 100K = **$0.04/month**
- **Total: ~$0.96/month**

---

## ✅ Recommendation

**Use Vercel Blob** because:
1. You're already on Vercel
2. Automatic optimization
3. Built-in CDN
4. Simple integration
5. Reasonable cost

**Alternative:** Cloudflare R2 if cost is critical (almost free!)

---

## 🔒 Security Considerations

1. **Path-based isolation** - Users can only access their own images
2. **Public URLs** - Images are public (needed for websites)
3. **Access control** - Implement at application level
4. **Rate limiting** - Prevent abuse of image storage

---

## 📝 Next Steps

1. Review this architecture
2. Choose storage provider (Vercel Blob recommended)
3. Implement image storage service
4. Update scraper to download images
5. Test with a sample website rebuild
6. Deploy and monitor costs
