/**
 * Website Image Storage Service
 * Downloads images from scraped websites and stores them in cloud storage
 * Supports Vercel Blob, Cloudflare R2, and AWS S3
 */

import { put, del, list, head } from '@vercel/blob';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import crypto from 'crypto';

export interface StoredImage {
  url: string;
  path: string;
  originalUrl: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  contentType: string;
  alt?: string;
}

export interface ImageStorageConfig {
  provider: 'vercel' | 's3' | 'r2';
  userId: string;
  websiteId: string;
}

export class WebsiteImageStorage {
  private s3Client: S3Client | null = null;
  private config: ImageStorageConfig;

  constructor(config: ImageStorageConfig) {
    this.config = config;
    
    // Initialize S3 client if using S3/R2
    if (config.provider === 's3' || config.provider === 'r2') {
      this.initializeS3();
    }
  }

  private initializeS3() {
    if (this.config.provider === 'r2') {
      // Cloudflare R2 uses S3-compatible API
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
        },
      });
    } else {
      // AWS S3
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

  /**
   * Download and store image from URL
   */
  async downloadAndStore(
    imageUrl: string,
    alt?: string,
    options?: {
      createOptimized?: boolean;
      createThumbnail?: boolean;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): Promise<StoredImage> {
    try {
      // 1. Download image
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebsiteBuilder/1.0)',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // 2. Validate it's an image
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // 3. Get image metadata
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width;
      const height = metadata.height;

      // 4. Generate unique filename
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const extension = this.getExtension(contentType, imageUrl);
      const filename = `${hash}${extension}`;

      // 5. Create multi-tenant path
      const basePath = `website-images/${this.config.userId}/${this.config.websiteId}`;
      const originalPath = `${basePath}/original/${filename}`;

      // 6. Upload original image
      let storedUrl: string;
      let storedPath: string;

      if (this.config.provider === 'vercel') {
        // Check if token is set
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error(
            'BLOB_READ_WRITE_TOKEN is not set. ' +
            'Please add it to your environment variables. ' +
            'See VERCEL_BLOB_SETUP.md for instructions.'
          );
        }

        const blob = await put(originalPath, buffer, {
          access: 'public',
          contentType,
          addRandomSuffix: false,
        });
        storedUrl = blob.url;
        storedPath = blob.pathname;
      } else {
        // S3 or R2
        const bucket = this.config.provider === 'r2' 
          ? process.env.CLOUDFLARE_R2_BUCKET 
          : process.env.AWS_S3_BUCKET;
        
        if (!bucket) {
          throw new Error('Bucket not configured');
        }

        await this.s3Client!.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: originalPath,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000', // 1 year cache
          })
        );

        const baseUrl = this.config.provider === 'r2'
          ? process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`
          : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
        
        storedUrl = `${baseUrl}/${originalPath}`;
        storedPath = originalPath;
      }

      const result: StoredImage = {
        url: storedUrl,
        path: storedPath,
        originalUrl: imageUrl,
        width,
        height,
        size: buffer.length,
        contentType,
        alt,
      };

      // 7. Create optimized version if requested
      if (options?.createOptimized) {
        result.optimizedUrl = await this.createOptimizedVersion(
          buffer,
          originalPath,
          width,
          height,
          options.maxWidth,
          options.maxHeight
        );
      }

      // 8. Create thumbnail if requested
      if (options?.createThumbnail) {
        result.thumbnailUrl = await this.createThumbnail(
          buffer,
          originalPath
        );
      }

      return result;
    } catch (error: any) {
      console.error(`Failed to download and store image ${imageUrl}:`, error.message);
      throw error;
    }
  }

  /**
   * Create optimized WebP version
   */
  private async createOptimizedVersion(
    originalBuffer: Buffer,
    originalPath: string,
    originalWidth: number | undefined,
    originalHeight: number | undefined,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<string> {
    try {
      let optimizedBuffer = originalBuffer;

      // Resize if needed
      if (maxWidth || maxHeight) {
        const sharpInstance = sharp(originalBuffer);
        const resizeOptions: any = {};

        if (maxWidth && originalWidth && originalWidth > maxWidth) {
          resizeOptions.width = maxWidth;
        }
        if (maxHeight && originalHeight && originalHeight > maxHeight) {
          resizeOptions.height = maxHeight;
        }

        if (Object.keys(resizeOptions).length > 0) {
          optimizedBuffer = await sharpInstance
            .resize(resizeOptions.width, resizeOptions.height, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 85 })
            .toBuffer();
        } else {
          optimizedBuffer = await sharp(originalBuffer)
            .webp({ quality: 85 })
            .toBuffer();
        }
      } else {
        // Just convert to WebP
        optimizedBuffer = await sharp(originalBuffer)
          .webp({ quality: 85 })
          .toBuffer();
      }

      // Upload optimized version
      const optimizedPath = originalPath.replace('/original/', '/optimized/').replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');

      if (this.config.provider === 'vercel') {
        const blob = await put(optimizedPath, optimizedBuffer, {
          access: 'public',
          contentType: 'image/webp',
          addRandomSuffix: false,
        });
        return blob.url;
      } else {
        // S3 or R2
        const bucket = this.config.provider === 'r2' 
          ? process.env.CLOUDFLARE_R2_BUCKET 
          : process.env.AWS_S3_BUCKET;
        
        await this.s3Client!.send(
          new PutObjectCommand({
            Bucket: bucket!,
            Key: optimizedPath,
            Body: optimizedBuffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000',
          })
        );

        const baseUrl = this.config.provider === 'r2'
          ? process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`
          : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
        
        return `${baseUrl}/${optimizedPath}`;
      }
    } catch (error: any) {
      console.error('Failed to create optimized version:', error);
      throw error;
    }
  }

  /**
   * Create thumbnail
   */
  private async createThumbnail(
    originalBuffer: Buffer,
    originalPath: string,
    maxWidth: number = 300,
    maxHeight: number = 300
  ): Promise<string> {
    try {
      // Resize to thumbnail
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Upload thumbnail
      const thumbnailPath = originalPath.replace('/original/', '/thumbnails/').replace(/(\.[^.]+)$/, '-thumb.webp');

      if (this.config.provider === 'vercel') {
        const blob = await put(thumbnailPath, thumbnailBuffer, {
          access: 'public',
          contentType: 'image/webp',
          addRandomSuffix: false,
        });
        return blob.url;
      } else {
        // S3 or R2
        const bucket = this.config.provider === 'r2' 
          ? process.env.CLOUDFLARE_R2_BUCKET 
          : process.env.AWS_S3_BUCKET;
        
        await this.s3Client!.send(
          new PutObjectCommand({
            Bucket: bucket!,
            Key: thumbnailPath,
            Body: thumbnailBuffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000',
          })
        );

        const baseUrl = this.config.provider === 'r2'
          ? process.env.CLOUDFLARE_R2_PUBLIC_URL || `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`
          : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
        
        return `${baseUrl}/${thumbnailPath}`;
      }
    } catch (error: any) {
      console.error('Failed to create thumbnail:', error);
      throw error;
    }
  }

  /**
   * Delete all images for a website
   */
  async deleteWebsiteImages(): Promise<void> {
    const prefix = `website-images/${this.config.userId}/${this.config.websiteId}/`;

    if (this.config.provider === 'vercel') {
      const blobs = await list({ prefix });
      await Promise.all(blobs.blobs.map(blob => del(blob.url)));
    } else {
      // S3 or R2
      const bucket = this.config.provider === 'r2' 
        ? process.env.CLOUDFLARE_R2_BUCKET 
        : process.env.AWS_S3_BUCKET;
      
      if (!bucket) {
        throw new Error('Bucket not configured');
      }

      // List all objects with prefix
      let continuationToken: string | undefined;
      do {
        const listResponse = await this.s3Client!.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          })
        );

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          // Delete all objects
          await Promise.all(
            listResponse.Contents.map(object =>
              this.s3Client!.send(
                new DeleteObjectCommand({
                  Bucket: bucket,
                  Key: object.Key!,
                })
              )
            )
          );
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);
    }
  }

  /**
   * Get extension from content type or URL
   */
  private getExtension(contentType: string, url: string): string {
    // Try content type first
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('gif')) return '.gif';
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('svg')) return '.svg';

    // Fallback to URL extension
    const urlMatch = url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
    return urlMatch ? `.${urlMatch[1]}` : '.jpg';
  }
}
