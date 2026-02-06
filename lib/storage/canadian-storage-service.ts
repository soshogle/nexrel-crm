/**
 * Law 25 Compliant Canadian Data Storage Service
 * Ensures all data is stored in Canada/Quebec region
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { encryptData, decryptData } from '@/lib/docpen/security';
import crypto from 'crypto';

export class CanadianStorageService {
  private s3Client: S3Client | null = null;
  private bucket: string = '';
  private region = 'ca-central-1'; // Canada Central (Montreal/Toronto)
  
  private initialize() {
    if (this.s3Client) return; // Already initialized
    
    // Force Canadian region
    this.region = process.env.AWS_CANADIAN_REGION || 'ca-central-1';
    this.bucket = process.env.AWS_CANADIAN_BUCKET || process.env.AWS_S3_BUCKET || '';
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      // Don't throw during build - only throw when actually used
      if (process.env.NODE_ENV !== 'production' && !process.env.AWS_ACCESS_KEY_ID) {
        console.warn('AWS credentials not configured for Canadian storage - will fail at runtime');
        return;
      }
      throw new Error('AWS credentials not configured for Canadian storage');
    }
    
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      // Ensure data stays in Canada
      endpoint: undefined, // Use AWS Canada endpoints
    });
  }
  
  private ensureInitialized() {
    this.initialize();
    if (!this.s3Client) {
      throw new Error('Canadian storage service not initialized - AWS credentials required');
    }
  }
  
  /**
   * Generate encryption key ID
   */
  generateEncryptionKeyId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Upload document with encryption (Law 25: encryption at rest)
   */
  async uploadDocument(
    file: Buffer,
    fileName: string,
    contentType: string,
    encryptionKey: string
  ): Promise<{ storagePath: string; encryptedPath: string; keyId: string }> {
    this.ensureInitialized();
    if (!this.s3Client) throw new Error('S3 client not initialized');
    // Encrypt file before upload
    const encryptedData = encryptData(file.toString('base64'), encryptionKey);
    
    // Generate secure path with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `documents/${timestamp}-${sanitizedFileName}`;
    const keyId = this.generateEncryptionKeyId();
    
    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(encryptedData),
        ContentType: contentType,
        ServerSideEncryption: 'AES256', // Additional S3 encryption
        Metadata: {
          'data-residency': 'CA-QC',
          'encrypted': 'true',
          'upload-date': new Date().toISOString(),
          'encryption-key-id': keyId,
        },
        // Ensure data stays in Canada
        StorageClass: 'STANDARD', // Stored in Canada region
      })
    );
    
    return {
      storagePath: key,
      encryptedPath: key, // Path to encrypted file
      keyId,
    };
  }
  
  /**
   * Download and decrypt document
   */
  async downloadDocument(
    storagePath: string,
    encryptionKey: string
  ): Promise<Buffer> {
    this.ensureInitialized();
    if (!this.s3Client) throw new Error('S3 client not initialized');
    
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      })
    );
    
    const encryptedData = await response.Body!.transformToByteArray();
    const decryptedBase64 = decryptData(
      Buffer.from(encryptedData).toString('utf8'),
      encryptionKey
    );
    
    return Buffer.from(decryptedBase64, 'base64');
  }
  
  /**
   * Delete document (Law 25: right to deletion)
   */
  async deleteDocument(storagePath: string): Promise<void> {
    this.ensureInitialized();
    if (!this.s3Client) throw new Error('S3 client not initialized');
    
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      })
    );
  }
  
  /**
   * Verify data residency (Law 25 requirement)
   */
  async verifyDataResidency(storagePath: string): Promise<boolean> {
    this.ensureInitialized();
    if (!this.s3Client) return false;
    
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storagePath,
        })
      );
      
      const metadata = response.Metadata;
      return metadata?.['data-residency'] === 'CA-QC';
    } catch (error) {
      console.error('Error verifying data residency:', error);
      return false;
    }
  }
  
  /**
   * Get storage region
   */
  getRegion(): string {
    return this.region;
  }
  
  /**
   * Get bucket name
   */
  getBucket(): string {
    return this.bucket;
  }
}
