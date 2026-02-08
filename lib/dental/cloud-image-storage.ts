/**
 * Cloud Image Storage Service
 * Stores compressed images in external cloud storage (AWS S3, Azure Blob, etc.)
 * Returns URLs for thumbnail, preview, and full-resolution versions
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { BlobServiceClient } from "@azure/storage-blob";
import crypto from 'crypto';

export interface ImageStorageUrls {
  thumbnailUrl: string;
  previewUrl: string;
  fullUrl: string;
  storagePaths: {
    thumbnail: string;
    preview: string;
    full: string;
  };
}

export interface StorageConfig {
  provider: 'aws' | 'azure' | 'gcp';
  bucket?: string; // AWS/GCP
  container?: string; // Azure
  region?: string;
  cdnUrl?: string; // Optional CDN URL prefix
}

export class CloudImageStorageService {
  private s3Client: S3Client | null = null;
  private azureClient: BlobServiceClient | null = null;
  private config: StorageConfig;
  private bucket: string = '';
  private container: string = '';
  private region: string = 'ca-central-1';

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      provider: config?.provider || (process.env.CLOUD_STORAGE_PROVIDER as 'aws' | 'azure' | 'gcp') || 'aws',
      bucket: config?.bucket || process.env.AWS_S3_BUCKET || process.env.CLOUD_STORAGE_BUCKET || '',
      container: config?.container || process.env.AZURE_STORAGE_CONTAINER || '',
      region: config?.region || process.env.AWS_REGION || process.env.AZURE_REGION || 'ca-central-1',
      cdnUrl: config?.cdnUrl || process.env.CDN_URL || '',
    };
    this.bucket = this.config.bucket || '';
    this.container = this.config.container || '';
    this.region = this.config.region || 'ca-central-1';
  }

  /**
   * Initialize storage client based on provider
   */
  private initialize() {
    if (this.config.provider === 'aws') {
      this.initializeAWS();
    } else if (this.config.provider === 'azure') {
      this.initializeAzure();
    } else if (this.config.provider === 'gcp') {
      // GCP implementation can be added later
      throw new Error('GCP storage not yet implemented');
    }
  }

  private initializeAWS() {
    if (this.s3Client) return;

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('AWS credentials not configured - will fail at runtime');
        return;
      }
      throw new Error('AWS credentials not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  private initializeAzure() {
    if (this.azureClient) return;

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Azure storage connection string not configured - will fail at runtime');
        return;
      }
      throw new Error('Azure storage connection string not configured');
    }

    this.azureClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  private ensureInitialized() {
    this.initialize();
    if (this.config.provider === 'aws' && !this.s3Client) {
      throw new Error('AWS S3 client not initialized');
    }
    if (this.config.provider === 'azure' && !this.azureClient) {
      throw new Error('Azure Blob client not initialized');
    }
  }

  /**
   * Upload compressed images (thumbnail, preview, full) to cloud storage
   */
  async uploadCompressedImages(
    xrayId: string,
    thumbnail: Buffer,
    preview: Buffer,
    full: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<ImageStorageUrls> {
    this.ensureInitialized();

    const timestamp = Date.now();
    const basePath = `dental/xrays/${xrayId}/${timestamp}`;

    if (this.config.provider === 'aws') {
      return this.uploadToAWS(basePath, thumbnail, preview, full, contentType);
    } else if (this.config.provider === 'azure') {
      return this.uploadToAzure(basePath, thumbnail, preview, full, contentType);
    }

    throw new Error(`Unsupported storage provider: ${this.config.provider}`);
  }

  private async uploadToAWS(
    basePath: string,
    thumbnail: Buffer,
    preview: Buffer,
    full: Buffer,
    contentType: string
  ): Promise<ImageStorageUrls> {
    if (!this.s3Client) throw new Error('S3 client not initialized');

    const thumbnailPath = `${basePath}/thumbnail.jpg`;
    const previewPath = `${basePath}/preview.jpg`;
    const fullPath = `${basePath}/full.jpg`;

    // Upload thumbnail
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbnailPath,
        Body: thumbnail,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
        Metadata: {
          'image-type': 'thumbnail',
          'upload-date': new Date().toISOString(),
        },
      })
    );

    // Upload preview
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: previewPath,
        Body: preview,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          'image-type': 'preview',
          'upload-date': new Date().toISOString(),
        },
      })
    );

    // Upload full resolution
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullPath,
        Body: full,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          'image-type': 'full',
          'upload-date': new Date().toISOString(),
        },
      })
    );

    // Generate URLs
    const cdnPrefix = this.config.cdnUrl || '';
    const baseUrl = cdnPrefix || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    return {
      thumbnailUrl: `${baseUrl}/${thumbnailPath}`,
      previewUrl: `${baseUrl}/${previewPath}`,
      fullUrl: `${baseUrl}/${fullPath}`,
      storagePaths: {
        thumbnail: thumbnailPath,
        preview: previewPath,
        full: fullPath,
      },
    };
  }

  private async uploadToAzure(
    basePath: string,
    thumbnail: Buffer,
    preview: Buffer,
    full: Buffer,
    contentType: string
  ): Promise<ImageStorageUrls> {
    if (!this.azureClient) throw new Error('Azure client not initialized');

    const containerClient = this.azureClient.getContainerClient(this.container);
    await containerClient.createIfNotExists({ access: 'blob' });

    const thumbnailPath = `${basePath}/thumbnail.jpg`;
    const previewPath = `${basePath}/preview.jpg`;
    const fullPath = `${basePath}/full.jpg`;

    // Upload thumbnail
    const thumbnailBlob = containerClient.getBlockBlobClient(thumbnailPath);
    await thumbnailBlob.upload(thumbnail, thumbnail.length, {
      blobHTTPHeaders: { blobContentType: contentType },
      metadata: {
        'image-type': 'thumbnail',
        'upload-date': new Date().toISOString(),
      },
    });

    // Upload preview
    const previewBlob = containerClient.getBlockBlobClient(previewPath);
    await previewBlob.upload(preview, preview.length, {
      blobHTTPHeaders: { blobContentType: contentType },
      metadata: {
        'image-type': 'preview',
        'upload-date': new Date().toISOString(),
      },
    });

    // Upload full resolution
    const fullBlob = containerClient.getBlockBlobClient(fullPath);
    await fullBlob.upload(full, full.length, {
      blobHTTPHeaders: { blobContentType: contentType },
      metadata: {
        'image-type': 'full',
        'upload-date': new Date().toISOString(),
      },
    });

    // Generate URLs
    const cdnPrefix = this.config.cdnUrl || '';
    const baseUrl = cdnPrefix || thumbnailBlob.url.split('/').slice(0, -1).join('/');

    return {
      thumbnailUrl: `${baseUrl}/${thumbnailPath}`,
      previewUrl: `${baseUrl}/${previewPath}`,
      fullUrl: `${baseUrl}/${fullPath}`,
      storagePaths: {
        thumbnail: thumbnailPath,
        preview: previewPath,
        full: fullPath,
      },
    };
  }

  /**
   * Delete images from cloud storage
   */
  async deleteImages(storagePaths: { thumbnail: string; preview: string; full: string }): Promise<void> {
    this.ensureInitialized();

    if (this.config.provider === 'aws') {
      if (!this.s3Client) throw new Error('S3 client not initialized');
      
      await Promise.all([
        this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePaths.thumbnail })),
        this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePaths.preview })),
        this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePaths.full })),
      ]);
    } else if (this.config.provider === 'azure') {
      if (!this.azureClient) throw new Error('Azure client not initialized');
      
      const containerClient = this.azureClient.getContainerClient(this.container);
      await Promise.all([
        containerClient.deleteBlob(storagePaths.thumbnail),
        containerClient.deleteBlob(storagePaths.preview),
        containerClient.deleteBlob(storagePaths.full),
      ]);
    }
  }

  /**
   * Get storage provider
   */
  getProvider(): string {
    return this.config.provider;
  }

  /**
   * Get region
   */
  getRegion(): string {
    return this.region;
  }
}
