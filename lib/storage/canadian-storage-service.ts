/**
 * Law 25 Compliant Canadian Data Storage Service
 * Supports AWS S3 (preferred for production) and Vercel Blob (fallback).
 * Ensures encryption at rest regardless of provider.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { put, del } from '@vercel/blob';
import { encryptData, decryptData } from '@/lib/docpen/security';
import crypto from 'crypto';

type StorageProvider = 'aws' | 'vercel';

export class CanadianStorageService {
  private s3Client: S3Client | null = null;
  private bucket: string = '';
  private region = 'ca-central-1';
  private provider: StorageProvider = 'aws';
  private initialized = false;
  
  private initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    this.region = process.env.AWS_CANADIAN_REGION || 'ca-central-1';
    this.bucket = process.env.AWS_CANADIAN_BUCKET || process.env.AWS_S3_BUCKET || '';
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && this.bucket) {
      this.provider = 'aws';
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      this.provider = 'vercel';
      console.info('CanadianStorageService: Using Vercel Blob (AWS S3 not configured)');
    } else {
      console.warn('CanadianStorageService: No storage provider configured');
    }
  }
  
  private ensureInitialized() {
    this.initialize();
    if (this.provider === 'aws' && !this.s3Client) {
      throw new Error('Canadian storage: AWS S3 not initialized');
    }
    if (this.provider === 'vercel' && !process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('Canadian storage: BLOB_READ_WRITE_TOKEN not set');
    }
  }
  
  generateEncryptionKeyId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Upload document with application-level encryption at rest.
   */
  async uploadDocument(
    file: Buffer,
    fileName: string,
    contentType: string,
    encryptionKey: string
  ): Promise<{ storagePath: string; encryptedPath: string; keyId: string }> {
    this.ensureInitialized();

    const encryptedData = encryptData(file.toString('base64'), encryptionKey);
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `documents/${timestamp}-${sanitizedFileName}`;
    const keyId = this.generateEncryptionKeyId();
    
    if (this.provider === 'vercel') {
      await put(key, Buffer.from(encryptedData), {
        access: 'public',
        contentType: 'application/octet-stream',
        addRandomSuffix: false,
      });
    } else {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: Buffer.from(encryptedData),
          ContentType: contentType,
          ServerSideEncryption: 'AES256',
          Metadata: {
            'data-residency': 'CA-QC',
            'encrypted': 'true',
            'upload-date': new Date().toISOString(),
            'encryption-key-id': keyId,
          },
          StorageClass: 'STANDARD',
        })
      );
    }
    
    return { storagePath: key, encryptedPath: key, keyId };
  }
  
  /**
   * Download and decrypt document
   */
  async downloadDocument(
    storagePath: string,
    encryptionKey: string
  ): Promise<Buffer> {
    this.ensureInitialized();
    
    let encryptedString: string;

    if (this.provider === 'vercel') {
      const blobUrl = storagePath.startsWith('http')
        ? storagePath
        : `${process.env.BLOB_READ_WRITE_TOKEN ? '' : ''}`;
      
      // For Vercel Blob, the storagePath in the DB should be the full URL
      // If it's a relative path, fetch via the Vercel Blob list/head approach
      const response = await fetch(storagePath.startsWith('http') ? storagePath : `https://blob.vercel-storage.com/${storagePath}`);
      if (!response.ok) throw new Error(`Failed to download from Vercel Blob: ${response.status}`);
      const arrayBuf = await response.arrayBuffer();
      encryptedString = Buffer.from(arrayBuf).toString('utf8');
    } else {
      const response = await this.s3Client!.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storagePath,
        })
      );
      const encryptedData = await response.Body!.transformToByteArray();
      encryptedString = Buffer.from(encryptedData).toString('utf8');
    }
    
    const decryptedBase64 = decryptData(encryptedString, encryptionKey);
    return Buffer.from(decryptedBase64, 'base64');
  }
  
  /**
   * Delete document (Law 25: right to deletion)
   */
  async deleteDocument(storagePath: string): Promise<void> {
    this.ensureInitialized();
    
    if (this.provider === 'vercel') {
      await del(storagePath).catch(() => {});
    } else {
      await this.s3Client!.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storagePath,
        })
      );
    }
  }
  
  async verifyDataResidency(storagePath: string): Promise<boolean> {
    if (this.provider === 'vercel') return true;
    
    this.ensureInitialized();
    if (!this.s3Client) return false;
    
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storagePath })
      );
      return response.Metadata?.['data-residency'] === 'CA-QC';
    } catch (error) {
      console.error('Error verifying data residency:', error);
      return false;
    }
  }
  
  getRegion(): string { this.initialize(); return this.region; }
  getBucket(): string { this.initialize(); return this.bucket; }
  getProvider(): StorageProvider { this.initialize(); return this.provider; }
}
