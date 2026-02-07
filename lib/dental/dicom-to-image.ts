/**
 * DICOM to Image Conversion Service
 * Converts DICOM pixel data to PNG/JPEG images with windowing/leveling
 */

import sharp from 'sharp';
import { DicomPixelData } from './dicom-parser';

export interface ImageConversionOptions {
  windowCenter?: number;
  windowWidth?: number;
  outputFormat?: 'png' | 'jpeg';
  quality?: number;
  maxDimension?: number;
}

export class DicomToImageConverter {
  /**
   * Apply window/level (windowing) to pixel data
   * This adjusts brightness and contrast for optimal viewing
   */
  static applyWindowing(
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
      // Apply rescale slope/intercept
      const rescaledValue = pixelData[i] * rescaleSlope + rescaleIntercept;
      
      // Apply windowing
      let windowedValue: number;
      if (rescaledValue < windowMin) {
        windowedValue = 0;
      } else if (rescaledValue > windowMax) {
        windowedValue = 255;
      } else {
        // Linear mapping from window range to 0-255
        windowedValue = ((rescaledValue - windowMin) / windowWidth) * 255;
      }
      
      output[i] = Math.max(0, Math.min(255, Math.round(windowedValue)));
    }
    
    return output;
  }

  /**
   * Convert DICOM pixel data to image buffer (PNG/JPEG)
   */
  static async convertToImage(
    pixelData: DicomPixelData,
    options: ImageConversionOptions = {}
  ): Promise<Buffer> {
    const {
      windowCenter = pixelData.windowCenter,
      windowWidth = pixelData.windowWidth,
      outputFormat = 'png',
      quality = 90,
      maxDimension = 2048,
    } = options;

    // Apply windowing/leveling
    const windowedData = this.applyWindowing(
      pixelData.pixelData,
      windowCenter,
      windowWidth,
      pixelData.rescaleSlope,
      pixelData.rescaleIntercept
    );

    // Create image buffer
    // Sharp expects channels to be 1, 3, or 4 (grayscale, RGB, RGBA)
    const channels = pixelData.samplesPerPixel === 1 ? 1 : pixelData.samplesPerPixel === 3 ? 3 : 4;
    
    let imageBuffer = sharp(windowedData, {
      raw: {
        width: pixelData.width,
        height: pixelData.height,
        channels: channels as 1 | 3 | 4,
      },
    });

    // Resize if needed
    if (maxDimension) {
      const maxSize = Math.max(pixelData.width, pixelData.height);
      if (maxSize > maxDimension) {
        const scale = maxDimension / maxSize;
        imageBuffer = imageBuffer.resize(
          Math.round(pixelData.width * scale),
          Math.round(pixelData.height * scale),
          { fit: 'inside' }
        );
      }
    }

    // Convert to output format
    if (outputFormat === 'jpeg') {
      imageBuffer = imageBuffer.jpeg({ quality });
    } else {
      imageBuffer = imageBuffer.png();
    }

    return await imageBuffer.toBuffer();
  }

  /**
   * Generate multiple image previews with different window/level settings
   * Useful for dental X-rays where different tissues need different contrast
   */
  static async generatePreviews(
    pixelData: DicomPixelData,
    previews: Array<{ name: string; windowCenter: number; windowWidth: number }>
  ): Promise<Array<{ name: string; buffer: Buffer }>> {
    const results = await Promise.all(
      previews.map(async (preview) => {
        const buffer = await this.convertToImage(pixelData, {
          windowCenter: preview.windowCenter,
          windowWidth: preview.windowWidth,
          outputFormat: 'png',
        });
        return { name: preview.name, buffer };
      })
    );

    return results;
  }

  /**
   * Get optimal window/level settings for dental X-rays
   */
  static getOptimalWindowLevel(xrayType: string): { windowCenter: number; windowWidth: number } {
    // Default settings for different X-ray types
    const settings: Record<string, { windowCenter: number; windowWidth: number }> = {
      PANORAMIC: { windowCenter: 2000, windowWidth: 4000 },
      BITEWING: { windowCenter: 1500, windowWidth: 3000 },
      PERIAPICAL: { windowCenter: 1500, windowWidth: 3000 },
      CEPHALOMETRIC: { windowCenter: 2000, windowWidth: 4000 },
      CBCT: { windowCenter: 2000, windowWidth: 4000 },
    };

    return settings[xrayType.toUpperCase()] || { windowCenter: 2000, windowWidth: 4000 };
  }
}
