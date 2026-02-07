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

      // Extract pixel data
      let pixelData: Uint16Array | Uint8Array;
      
      if (pixelDataElement.Value) {
        // Pixel data is in the Value array
        if (bitsAllocated === 16) {
          // 16-bit data
          const pixelArray = new Uint16Array(rows * columns * samplesPerPixel);
          const valueArray = pixelDataElement.Value;
          
          // Handle different data formats
          if (valueArray instanceof Uint16Array) {
            pixelData = valueArray;
          } else if (valueArray instanceof ArrayBuffer) {
            pixelData = new Uint16Array(valueArray);
          } else if (Array.isArray(valueArray)) {
            // Convert array to Uint16Array
            pixelData = new Uint16Array(valueArray.length);
            for (let i = 0; i < valueArray.length; i++) {
              pixelData[i] = valueArray[i];
            }
          } else {
            // Try to extract from buffer
            const offset = pixelDataElement.offset || 0;
            const pixelBuffer = buffer.slice(offset);
            pixelData = new Uint16Array(pixelBuffer.buffer, pixelBuffer.byteOffset, rows * columns * samplesPerPixel);
          }
        } else {
          // 8-bit data
          const pixelArray = new Uint8Array(rows * columns * samplesPerPixel);
          const valueArray = pixelDataElement.Value;
          
          if (valueArray instanceof Uint8Array) {
            pixelData = valueArray;
          } else if (valueArray instanceof ArrayBuffer) {
            pixelData = new Uint8Array(valueArray);
          } else if (Array.isArray(valueArray)) {
            pixelData = new Uint8Array(valueArray);
          } else {
            const offset = pixelDataElement.offset || 0;
            const pixelBuffer = buffer.slice(offset);
            pixelData = new Uint8Array(pixelBuffer.buffer, pixelBuffer.byteOffset, rows * columns * samplesPerPixel);
          }
        }
      } else {
        // Pixel data might be in a separate buffer
        // Try to find it in the buffer
        throw new Error('Pixel data extraction from buffer not yet implemented');
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
