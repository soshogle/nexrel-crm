/**
 * DICOM Image Cache Service
 * Provides caching for converted DICOM images to improve performance
 */

import { prisma } from '@/lib/db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { DicomParser } from './dicom-parser';
import { DicomToImageConverter } from './dicom-to-image';
import { EncryptionKeyManager } from './encryption-key-manager';

interface CacheEntry {
  xrayId: string;
  imageUrl: string;
  cachedAt: Date;
  expiresAt: Date;
  windowCenter?: number;
  windowWidth?: number;
}

export class DicomCache {
  private static readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_CACHE_SIZE = 100; // Maximum cached entries

  /**
   * Get cached image URL for X-ray
   */
  static async getCachedImage(
    xrayId: string,
    windowCenter?: number,
    windowWidth?: number
  ): Promise<string | null> {
    try {
      const xray = await (prisma as any).dentalXRay.findUnique({
        where: { id: xrayId },
        select: {
          id: true,
          imageUrl: true,
          imageFile: true,
          dicomFile: true,
          xrayType: true,
        },
      });

      if (!xray) return null;

      // If imageUrl exists and matches window settings, use it
      if (xray.imageUrl && !windowCenter && !windowWidth) {
        return xray.imageUrl;
      }

      // If we need custom window/level, check cache or generate
      if (xray.dicomFile && (windowCenter || windowWidth)) {
        // For now, return the existing imageUrl
        // In production, we'd check a cache table for custom window/level images
        return xray.imageUrl;
      }

      return xray.imageUrl;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  /**
   * Cache converted image
   */
  static async cacheImage(
    xrayId: string,
    imageBuffer: Buffer,
    windowCenter?: number,
    windowWidth?: number
  ): Promise<string | null> {
    try {
      const storageService = new CanadianStorageService();
      const encryptionKey = require('crypto').randomBytes(32).toString('hex');

      const uploadResult = await storageService.uploadDocument(
        imageBuffer,
        `cache/${xrayId}-${Date.now()}.png`,
        'image/png',
        encryptionKey
      );

      // Update X-ray record with cached image URL
      await (prisma as any).dentalXRay.update({
        where: { id: xrayId },
        data: {
          imageUrl: `/api/dental/xrays/${xrayId}/image`,
        },
      });

      return uploadResult.storagePath;
    } catch (error) {
      console.error('Error caching image:', error);
      return null;
    }
  }

  /**
   * Generate and cache image with custom window/level
   */
  static async generateCachedImage(
    xrayId: string,
    windowCenter: number,
    windowWidth: number
  ): Promise<string | null> {
    try {
      const xray = await (prisma as any).dentalXRay.findUnique({
        where: { id: xrayId },
        select: {
          dicomFile: true,
          xrayType: true,
        },
      });

      if (!xray || !xray.dicomFile) return null;

      // Download DICOM file
      const storageService = new CanadianStorageService();
      const { EncryptionKeyManager } = await import('./encryption-key-manager');
      
      // Retrieve encryption key
      // Note: In production, keyId should be stored with X-ray record
      const encryptionKey = await EncryptionKeyManager.retrieveKey(xrayId, '');
      
      if (!encryptionKey) {
        console.error('[DicomCache] Unable to retrieve encryption key');
        return null;
      }

      // Download DICOM file
      const buffer = await storageService.downloadDocument(
        xray.dicomFile,
        encryptionKey
      );
      
      // Parse and convert
      const { pixelData } = DicomParser.parseDicom(buffer);
      const imageBuffer = await DicomToImageConverter.convertToImage(pixelData, {
        windowCenter,
        windowWidth,
        outputFormat: 'png',
      });

      // Cache the result
      return await this.cacheImage(xrayId, imageBuffer, windowCenter, windowWidth);
    } catch (error) {
      console.error('Error generating cached image:', error);
      return null;
    }
  }

  /**
   * Clear expired cache entries
   */
  static async clearExpiredCache(): Promise<void> {
    // In production, this would clean up old cached images
    // For now, it's a placeholder
  }
}
