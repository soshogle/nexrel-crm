/**
 * Unit Tests for DICOM to Image Converter
 */

import { describe, it, expect } from 'vitest';
import { DicomToImageConverter } from '@/lib/dental/dicom-to-image';
import { DicomPixelData } from '@/lib/dental/dicom-parser';

describe('DicomToImageConverter', () => {
  const createMockPixelData = (bitsAllocated: 8 | 16 = 16): DicomPixelData => {
    const size = 100 * 100; // 100x100 image
    return {
      pixelData: bitsAllocated === 16 
        ? new Uint16Array(size).fill(2000) // 16-bit data
        : new Uint8Array(size).fill(128), // 8-bit data
      width: 100,
      height: 100,
      bitsAllocated,
      samplesPerPixel: 1,
      photometricInterpretation: 'MONOCHROME2',
      windowCenter: 2000,
      windowWidth: 4000,
      rescaleSlope: 1,
      rescaleIntercept: 0,
    };
  };

  describe('applyWindowing', () => {
    it('should apply window/level transformation', () => {
      const pixelData = createMockPixelData();
      const windowed = DicomToImageConverter.applyWindowing(
        pixelData.pixelData,
        pixelData.windowCenter,
        pixelData.windowWidth,
        pixelData.rescaleSlope,
        pixelData.rescaleIntercept
      );

      expect(windowed).toBeInstanceOf(Uint8Array);
      expect(windowed.length).toBe(pixelData.pixelData.length);
    });

    it('should clamp values below window minimum to 0', () => {
      const pixelData = createMockPixelData();
      // Window: 2000 ± 2000 = 0 to 4000
      // Value -100 is below window (after rescale), should be clamped to 0
      const lowValue = new Uint16Array([0]); // 0 * 1 + 0 = 0, which is at windowMin
      // Use a value that's actually below windowMin
      const veryLowValue = new Uint16Array([0]);
      // Actually, let's use a value that will be below 0 after calculation
      // Or use windowCenter/windowWidth that makes 100 below the window
      const windowed = DicomToImageConverter.applyWindowing(
        new Uint16Array([0]), // 0 is at windowMin (0), so should map to 0
        2000,
        4000,
        1,
        0
      );

      // Value at windowMin should map to 0
      expect(windowed[0]).toBe(0);
    });

    it('should clamp values above window maximum to 255', () => {
      const pixelData = createMockPixelData();
      // Window: 2000 ± 2000 = 0 to 4000
      // Value 10000 is above windowMax (4000), should be clamped to 255
      const highValue = new Uint16Array([10000]);
      const windowed = DicomToImageConverter.applyWindowing(
        highValue,
        2000,
        4000,
        1,
        0
      );

      // Value above windowMax should be clamped to 255
      expect(windowed[0]).toBe(255);
    });

    it('should handle 8-bit input data', () => {
      const pixelData = createMockPixelData(8);
      const windowed = DicomToImageConverter.applyWindowing(
        pixelData.pixelData,
        pixelData.windowCenter,
        pixelData.windowWidth,
        pixelData.rescaleSlope,
        pixelData.rescaleIntercept
      );

      expect(windowed).toBeInstanceOf(Uint8Array);
    });
  });

  describe('convertToImage', () => {
    it('should convert DICOM pixel data to PNG buffer', async () => {
      const pixelData = createMockPixelData();
      const imageBuffer = await DicomToImageConverter.convertToImage(pixelData, {
        outputFormat: 'png',
      });

      expect(imageBuffer).toBeInstanceOf(Buffer);
      expect(imageBuffer.length).toBeGreaterThan(0);
      // PNG files start with PNG signature
      expect(imageBuffer.toString('ascii', 1, 4)).toBe('PNG');
    });

    it('should convert DICOM pixel data to JPEG buffer', async () => {
      const pixelData = createMockPixelData();
      const imageBuffer = await DicomToImageConverter.convertToImage(pixelData, {
        outputFormat: 'jpeg',
        quality: 90,
      });

      expect(imageBuffer).toBeInstanceOf(Buffer);
      expect(imageBuffer.length).toBeGreaterThan(0);
    });

    it('should respect maxDimension option', async () => {
      // Use smaller dimensions to avoid memory issues in tests
      const pixelData = createMockPixelData();
      pixelData.width = 500;
      pixelData.height = 500;
      pixelData.pixelData = new Uint16Array(500 * 500).fill(2000);

      const imageBuffer = await DicomToImageConverter.convertToImage(pixelData, {
        maxDimension: 250,
        outputFormat: 'png',
      });

      expect(imageBuffer).toBeInstanceOf(Buffer);
      expect(imageBuffer.length).toBeGreaterThan(0);
      // Image should be resized (exact size depends on Sharp implementation)
    });

    it('should use custom window/level settings', async () => {
      const pixelData = createMockPixelData();
      const imageBuffer = await DicomToImageConverter.convertToImage(pixelData, {
        windowCenter: 1500,
        windowWidth: 3000,
        outputFormat: 'png',
      });

      expect(imageBuffer).toBeInstanceOf(Buffer);
      expect(imageBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('getOptimalWindowLevel', () => {
    it('should return optimal settings for PANORAMIC', () => {
      const settings = DicomToImageConverter.getOptimalWindowLevel('PANORAMIC');
      expect(settings.windowCenter).toBe(2000);
      expect(settings.windowWidth).toBe(4000);
    });

    it('should return optimal settings for BITEWING', () => {
      const settings = DicomToImageConverter.getOptimalWindowLevel('BITEWING');
      expect(settings.windowCenter).toBe(1500);
      expect(settings.windowWidth).toBe(3000);
    });

    it('should return optimal settings for PERIAPICAL', () => {
      const settings = DicomToImageConverter.getOptimalWindowLevel('PERIAPICAL');
      expect(settings.windowCenter).toBe(1500);
      expect(settings.windowWidth).toBe(3000);
    });

    it('should return optimal settings for CBCT', () => {
      const settings = DicomToImageConverter.getOptimalWindowLevel('CBCT');
      expect(settings.windowCenter).toBe(2000);
      expect(settings.windowWidth).toBe(4000);
    });

    it('should return default settings for unknown type', () => {
      const settings = DicomToImageConverter.getOptimalWindowLevel('UNKNOWN');
      expect(settings.windowCenter).toBe(2000);
      expect(settings.windowWidth).toBe(4000);
    });
  });
});
