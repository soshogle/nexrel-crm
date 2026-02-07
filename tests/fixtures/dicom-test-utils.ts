/**
 * DICOM Test Utilities and Fixtures
 * Helper functions for creating test DICOM files and data
 */

import { DicomPixelData } from '@/lib/dental/dicom-parser';

/**
 * Create a mock DICOM pixel data for testing
 */
export function createMockPixelData(overrides?: Partial<DicomPixelData>): DicomPixelData {
  return {
    pixelData: new Uint16Array(100 * 100).fill(2000),
    width: 100,
    height: 100,
    bitsAllocated: 16,
    samplesPerPixel: 1,
    photometricInterpretation: 'MONOCHROME2',
    windowCenter: 2000,
    windowWidth: 4000,
    rescaleSlope: 1,
    rescaleIntercept: 0,
    ...overrides,
  };
}

/**
 * Create a minimal valid DICOM buffer for testing
 * Note: This is a simplified version - real tests should use actual DICOM files
 */
export function createMockDicomBuffer(): Buffer {
  // Create a buffer with DICOM preamble
  const buffer = Buffer.alloc(200);
  
  // Write DICOM tag (128-131: "DICM")
  buffer.write('DICM', 128);
  
  // Add some basic structure (simplified)
  // In real tests, use actual DICOM files from test fixtures directory
  
  return buffer;
}

/**
 * Test data for different X-ray types
 */
export const XRAY_TYPE_TEST_DATA = {
  PANORAMIC: {
    windowCenter: 2000,
    windowWidth: 4000,
    expectedTeeth: Array.from({ length: 32 }, (_, i) => (i + 1).toString()),
  },
  BITEWING: {
    windowCenter: 1500,
    windowWidth: 3000,
    expectedTeeth: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
  },
  PERIAPICAL: {
    windowCenter: 1500,
    windowWidth: 3000,
    expectedTeeth: ['8', '9'], // Example: front teeth
  },
  CBCT: {
    windowCenter: 2000,
    windowWidth: 4000,
    expectedTeeth: Array.from({ length: 32 }, (_, i) => (i + 1).toString()),
  },
};

/**
 * Expected error messages for validation
 */
export const EXPECTED_ERRORS = {
  FILE_TOO_SMALL: 'too small',
  INVALID_FORMAT: 'not a valid DICOM',
  MISSING_PIXEL_DATA: 'Pixel data not found',
  PARSE_ERROR: 'Failed to parse',
};

/**
 * Helper to create test file objects
 */
export function createTestFile(
  name: string,
  content: string | Buffer = '',
  mimeType: string = 'application/dicom'
): File {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}
