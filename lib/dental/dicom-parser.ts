/**
 * DICOM Parser Service
 * Parses DICOM files and extracts pixel data and metadata
 */

import * as dcmjs from 'dcmjs';
import { DicomDict } from 'dcmjs';

export interface DicomMetadata {
  patientId?: string;
  patientName?: string;
  studyDate?: string;
  studyTime?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
  manufacturer?: string;
  manufacturerModelName?: string;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  rows?: number;
  columns?: number;
  pixelSpacing?: number[];
  windowCenter?: number | number[];
  windowWidth?: number | number[];
  rescaleSlope?: number;
  rescaleIntercept?: number;
  [key: string]: any;
}

export interface DicomPixelData {
  pixelData: Uint16Array | Uint8Array;
  width: number;
  height: number;
  bitsAllocated: number;
  samplesPerPixel: number;
  photometricInterpretation: string;
  windowCenter: number;
  windowWidth: number;
  rescaleSlope: number;
  rescaleIntercept: number;
}

export class DicomParser {
  /**
   * Parse DICOM file buffer and extract metadata
   */
  static parseMetadata(buffer: Buffer): DicomMetadata {
    try {
      const dicomDict = dcmjs.data.DicomMessage.readFile(buffer);
      const dataset = dicomDict.dict;

      const metadata: DicomMetadata = {
        patientId: dataset['00100020']?.Value?.[0],
        patientName: dataset['00100010']?.Value?.[0]?.Alphabetic || dataset['00100010']?.Value?.[0],
        studyDate: dataset['00080020']?.Value?.[0],
        studyTime: dataset['00080030']?.Value?.[0],
        modality: dataset['00080060']?.Value?.[0],
        studyDescription: dataset['00081030']?.Value?.[0],
        seriesDescription: dataset['0008103E']?.Value?.[0],
        manufacturer: dataset['00080070']?.Value?.[0],
        manufacturerModelName: dataset['00081090']?.Value?.[0],
        bitsAllocated: dataset['00280100']?.Value?.[0],
        bitsStored: dataset['00280101']?.Value?.[0],
        highBit: dataset['00280102']?.Value?.[0],
        samplesPerPixel: dataset['00280002']?.Value?.[0] || 1,
        photometricInterpretation: dataset['00280004']?.Value?.[0] || 'MONOCHROME2',
        rows: dataset['00280010']?.Value?.[0],
        columns: dataset['00280011']?.Value?.[0],
        pixelSpacing: dataset['00280030']?.Value,
        windowCenter: dataset['00281050']?.Value,
        windowWidth: dataset['00281051']?.Value,
        rescaleSlope: dataset['00281053']?.Value?.[0] || 1,
        rescaleIntercept: dataset['00281052']?.Value?.[0] || 0,
      };

      return metadata;
    } catch (error) {
      console.error('Error parsing DICOM metadata:', error);
      throw new Error('Failed to parse DICOM file: ' + (error as Error).message);
    }
  }

  /**
   * Extract pixel data from DICOM file
   */
  static extractPixelData(buffer: Buffer): DicomPixelData {
    try {
      const dicomDict = dcmjs.data.DicomMessage.readFile(buffer);
      const dataset = dicomDict.dict;

      const rows = dataset['00280010']?.Value?.[0];
      const columns = dataset['00280011']?.Value?.[0];
      const bitsAllocated = dataset['00280100']?.Value?.[0] || 16;
      const samplesPerPixel = dataset['00280002']?.Value?.[0] || 1;
      const photometricInterpretation = dataset['00280004']?.Value?.[0] || 'MONOCHROME2';
      
      // Get window/level values
      const windowCenter = Array.isArray(dataset['00281050']?.Value)
        ? dataset['00281050'].Value[0]
        : dataset['00281050']?.Value?.[0] || 0;
      const windowWidth = Array.isArray(dataset['00281051']?.Value)
        ? dataset['00281051'].Value[0]
        : dataset['00281051']?.Value?.[0] || 0;
      
      const rescaleSlope = dataset['00281053']?.Value?.[0] || 1;
      const rescaleIntercept = dataset['00281052']?.Value?.[0] || 0;

      if (!rows || !columns) {
        throw new Error('Missing rows or columns in DICOM file');
      }

      // Find pixel data element (7FE0,0010)
      const pixelDataElement = dataset['7FE00010'];
      if (!pixelDataElement) {
        throw new Error('Pixel data not found in DICOM file');
      }

      // Extract pixel data — dcmjs returns Value as [ArrayBuffer] for bulk data
      let pixelData: Uint16Array | Uint8Array;
      const expectedPixels = rows * columns * samplesPerPixel;

      const rawValue = pixelDataElement.Value
        ?? pixelDataElement.InlineBinary
        ?? null;

      if (!rawValue) {
        throw new Error('Pixel data not found in DICOM element');
      }

      // Unwrap: dcmjs typically wraps bulk data as [ArrayBuffer]
      let ab: ArrayBuffer | null = null;
      if (rawValue instanceof ArrayBuffer) {
        ab = rawValue;
      } else if (Array.isArray(rawValue) && rawValue.length > 0 && rawValue[0] instanceof ArrayBuffer) {
        ab = rawValue[0];
      } else if (ArrayBuffer.isView(rawValue)) {
        ab = rawValue.buffer.slice(rawValue.byteOffset, rawValue.byteOffset + rawValue.byteLength);
      }

      if (ab) {
        pixelData = bitsAllocated === 16
          ? new Uint16Array(ab, 0, Math.min(ab.byteLength / 2, expectedPixels))
          : new Uint8Array(ab, 0, Math.min(ab.byteLength, expectedPixels));
      } else if (Array.isArray(rawValue)) {
        pixelData = bitsAllocated === 16
          ? Uint16Array.from(rawValue)
          : Uint8Array.from(rawValue);
      } else {
        throw new Error('Unsupported pixel data format');
      }

      return {
        pixelData,
        width: columns,
        height: rows,
        bitsAllocated,
        samplesPerPixel,
        photometricInterpretation,
        windowCenter: Number(windowCenter),
        windowWidth: Number(windowWidth) || (bitsAllocated === 16 ? 4096 : 256),
        rescaleSlope: Number(rescaleSlope),
        rescaleIntercept: Number(rescaleIntercept),
      };
    } catch (error) {
      console.error('Error extracting pixel data:', error);
      throw new Error('Failed to extract pixel data: ' + (error as Error).message);
    }
  }

  /**
   * Parse complete DICOM file (metadata + pixel data)
   */
  static parseDicom(buffer: Buffer): { metadata: DicomMetadata; pixelData: DicomPixelData } {
    const metadata = this.parseMetadata(buffer);
    const pixelData = this.extractPixelData(buffer);
    
    return { metadata, pixelData };
  }
}
