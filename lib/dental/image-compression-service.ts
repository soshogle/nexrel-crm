/**
 * Multi-Resolution Image Compression Service
 * Generates thumbnail, preview, and full-resolution versions with optimal compression
 * Industry-standard approach: 80-90% size reduction
 */

import sharp from 'sharp';
import { DicomPixelData } from './dicom-parser';

export interface CompressionResult {
  thumbnail: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  };
  preview: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  };
  full: {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
  };
  originalSize: number;
  compressionRatio: number;
}

export interface CompressionOptions {
  thumbnailSize?: number; // Default: 200px
  previewSize?: number; // Default: 1024px
  fullSize?: number; // Default: 2048px
  thumbnailQuality?: number; // Default: 75
  previewQuality?: number; // Default: 85
  fullQuality?: number; // Default: 90
  progressive?: boolean; // Progressive JPEG
}

export class ImageCompressionService {
  /**
   * Compress DICOM pixel data into multiple resolutions
   * Returns thumbnail (200px), preview (1024px), and full (2048px) versions
   */
  static async compressMultiResolution(
    pixelData: DicomPixelData,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const {
      thumbnailSize = 200,
      previewSize = 1024,
      fullSize = 2048,
      thumbnailQuality = 75,
      previewQuality = 85,
      fullQuality = 90,
      progressive = true,
    } = options;

    // Create base image from pixel data
    const channels = pixelData.samplesPerPixel === 1 ? 1 : pixelData.samplesPerPixel === 3 ? 3 : 4;
    
    const baseImage = sharp(pixelData.pixelData, {
      raw: {
        width: pixelData.width,
        height: pixelData.height,
        channels: channels as 1 | 3 | 4,
      },
    });

    // Apply windowing/leveling
    const windowedData = this.applyWindowing(
      pixelData.pixelData,
      pixelData.windowCenter,
      pixelData.windowWidth,
      pixelData.rescaleSlope,
      pixelData.rescaleIntercept
    );

    const windowedImage = sharp(windowedData, {
      raw: {
        width: pixelData.width,
        height: pixelData.height,
        channels: channels as 1 | 3 | 4,
      },
    });

    // Generate thumbnail (smallest, fastest loading)
    const thumbnailBuffer = await windowedImage
      .resize(thumbnailSize, thumbnailSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: thumbnailQuality, progressive })
      .toBuffer();

    // Generate preview (medium, for list views)
    const previewBuffer = await windowedImage
      .resize(previewSize, previewSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: previewQuality, progressive })
      .toBuffer();

    // Generate full resolution (for detailed viewing)
    const fullBuffer = await windowedImage
      .resize(fullSize, fullSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: fullQuality, progressive })
      .toBuffer();

    // Get dimensions
    const thumbnailMeta = await sharp(thumbnailBuffer).metadata();
    const previewMeta = await sharp(previewBuffer).metadata();
    const fullMeta = await sharp(fullBuffer).metadata();

    const originalSize = pixelData.pixelData.length;
    const compressedSize = fullBuffer.length;
    const compressionRatio = (1 - compressedSize / originalSize) * 100;

    return {
      thumbnail: {
        buffer: thumbnailBuffer,
        width: thumbnailMeta.width || thumbnailSize,
        height: thumbnailMeta.height || thumbnailSize,
        size: thumbnailBuffer.length,
      },
      preview: {
        buffer: previewBuffer,
        width: previewMeta.width || previewSize,
        height: previewMeta.height || previewSize,
        size: previewBuffer.length,
      },
      full: {
        buffer: fullBuffer,
        width: fullMeta.width || pixelData.width,
        height: fullMeta.height || pixelData.height,
        size: fullBuffer.length,
      },
      originalSize,
      compressionRatio,
    };
  }

  /**
   * Apply window/level (windowing) to pixel data
   */
  private static applyWindowing(
    pixelData: Uint16Array | Uint8Array,
    windowCenter: number,
    windowWidth: number,
    rescaleSlope: number = 1,
    rescaleIntercept: number = 0
  ): Uint8Array {
    const windowMin = windowCenter - windowWidth / 2;
    const windowMax = windowCenter + windowWidth / 2;
    
    const output = new Uint8Array(pixelData.length);
    
    for (let i = 0; i < pixelData.length; i++) {
      const rescaledValue = pixelData[i] * rescaleSlope + rescaleIntercept;
      
      let windowedValue: number;
      if (rescaledValue < windowMin) {
        windowedValue = 0;
      } else if (rescaledValue > windowMax) {
        windowedValue = 255;
      } else {
        windowedValue = ((rescaledValue - windowMin) / windowWidth) * 255;
      }
      
      output[i] = Math.max(0, Math.min(255, Math.round(windowedValue)));
    }
    
    return output;
  }

  /**
   * Compress existing image buffer (for non-DICOM images)
   */
  static async compressImageBuffer(
    imageBuffer: Buffer,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const {
      thumbnailSize = 200,
      previewSize = 1024,
      fullSize = 2048,
      thumbnailQuality = 75,
      previewQuality = 85,
      fullQuality = 90,
      progressive = true,
    } = options;

    const baseImage = sharp(imageBuffer);

    // Get original dimensions
    const originalMeta = await baseImage.metadata();
    const originalSize = imageBuffer.length;

    // Generate thumbnail
    const thumbnailBuffer = await baseImage
      .clone()
      .resize(thumbnailSize, thumbnailSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: thumbnailQuality, progressive })
      .toBuffer();

    // Generate preview
    const previewBuffer = await baseImage
      .clone()
      .resize(previewSize, previewSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: previewQuality, progressive })
      .toBuffer();

    // Generate full resolution
    const fullBuffer = await baseImage
      .clone()
      .resize(fullSize, fullSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: fullQuality, progressive })
      .toBuffer();

    // Get dimensions
    const thumbnailMeta = await sharp(thumbnailBuffer).metadata();
    const previewMeta = await sharp(previewBuffer).metadata();
    const fullMeta = await sharp(fullBuffer).metadata();

    const compressedSize = fullBuffer.length;
    const compressionRatio = (1 - compressedSize / originalSize) * 100;

    return {
      thumbnail: {
        buffer: thumbnailBuffer,
        width: thumbnailMeta.width || thumbnailSize,
        height: thumbnailMeta.height || thumbnailSize,
        size: thumbnailBuffer.length,
      },
      preview: {
        buffer: previewBuffer,
        width: previewMeta.width || previewSize,
        height: previewMeta.height || previewSize,
        size: previewBuffer.length,
      },
      full: {
        buffer: fullBuffer,
        width: fullMeta.width || originalMeta.width || fullSize,
        height: fullMeta.height || originalMeta.height || fullSize,
        size: fullBuffer.length,
      },
      originalSize,
      compressionRatio,
    };
  }

  /**
   * Get optimal compression settings for X-ray type
   */
  static getOptimalSettings(xrayType: string): CompressionOptions {
    // Different X-ray types may benefit from different compression
    const settings: Record<string, CompressionOptions> = {
      PANORAMIC: {
        thumbnailSize: 200,
        previewSize: 1024,
        fullSize: 2048,
        thumbnailQuality: 75,
        previewQuality: 85,
        fullQuality: 90,
        progressive: true,
      },
      BITEWING: {
        thumbnailSize: 200,
        previewSize: 1024,
        fullSize: 2048,
        thumbnailQuality: 80,
        previewQuality: 88,
        fullQuality: 92,
        progressive: true,
      },
      PERIAPICAL: {
        thumbnailSize: 200,
        previewSize: 1024,
        fullSize: 2048,
        thumbnailQuality: 80,
        previewQuality: 88,
        fullQuality: 92,
        progressive: true,
      },
      CEPHALOMETRIC: {
        thumbnailSize: 200,
        previewSize: 1024,
        fullSize: 2048,
        thumbnailQuality: 75,
        previewQuality: 85,
        fullQuality: 90,
        progressive: true,
      },
      CBCT: {
        thumbnailSize: 200,
        previewSize: 1024,
        fullSize: 2048,
        thumbnailQuality: 75,
        previewQuality: 85,
        fullQuality: 90,
        progressive: true,
      },
    };

    return settings[xrayType.toUpperCase()] || settings.PANORAMIC;
  }
}
