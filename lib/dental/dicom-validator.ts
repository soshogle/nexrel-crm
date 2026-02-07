/**
 * DICOM Validator
 * Validates DICOM files before processing
 */

import { DicomErrorHandler, DicomErrorType } from './dicom-error-handler';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    fileSize: number;
    hasDicomPreamble: boolean;
    transferSyntax?: string;
    modality?: string;
  };
}

export class DicomValidator {
  /**
   * Validate DICOM file buffer
   */
  static validate(buffer: Buffer): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: ValidationResult['metadata'] = {
      fileSize: buffer.length,
      hasDicomPreamble: false,
    };

    // Check minimum file size (DICOM files should be at least 132 bytes for header)
    if (buffer.length < 132) {
      errors.push('File is too small to be a valid DICOM file (minimum 132 bytes)');
      return { valid: false, errors, warnings, metadata };
    }

    // Check for DICOM preamble (bytes 0-127 should be 0x00, bytes 128-131 should be "DICM")
    const preamble = buffer.slice(0, 128);
    const dicomTag = buffer.slice(128, 132).toString('ascii');

    if (dicomTag === 'DICM') {
      metadata.hasDicomPreamble = true;
    } else {
      // Some DICOM files don't have preamble (Part 10 files)
      // Check if it starts with a valid DICOM tag (group 0002)
      const firstGroup = buffer.readUInt16LE(0);
      if (firstGroup !== 0x0002 && dicomTag !== 'DICM') {
        errors.push('File does not appear to be a valid DICOM file (missing DICM tag or valid group)');
        return { valid: false, errors, warnings, metadata };
      }
    }

    // Check file size warnings
    if (buffer.length > 100 * 1024 * 1024) {
      warnings.push('File is very large (>100MB). Processing may take longer.');
    }

    if (buffer.length < 1024) {
      warnings.push('File is very small. It may not contain image data.');
    }

    // Try to read basic metadata
    try {
      // Check for common DICOM elements
      // Group 0002 elements (File Meta Information)
      // Group 0008 elements (Identification)
      // This is a simplified check - full parsing would be done by DicomParser
    } catch (error) {
      warnings.push('Unable to read DICOM metadata. File may still be valid.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Validate file extension
   */
  static validateExtension(filename: string): boolean {
    const validExtensions = ['.dcm', '.dicom', '.DCM', '.DICOM'];
    return validExtensions.some((ext) => filename.toLowerCase().endsWith(ext.toLowerCase()));
  }

  /**
   * Validate file type from MIME type
   */
  static validateMimeType(mimeType: string): boolean {
    const validMimeTypes = [
      'application/dicom',
      'application/x-dicom',
      'application/octet-stream', // Some systems use this
    ];
    return validMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Comprehensive validation
   */
  static validateFile(
    buffer: Buffer,
    filename: string,
    mimeType?: string
  ): ValidationResult {
    const result = this.validate(buffer);
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    // Validate extension
    if (!this.validateExtension(filename)) {
      warnings.push(
        `File extension may not be standard DICOM format. Expected: .dcm or .dicom, got: ${filename.split('.').pop()}`
      );
    }

    // Validate MIME type if provided
    if (mimeType && !this.validateMimeType(mimeType)) {
      warnings.push(`MIME type may not be standard DICOM format: ${mimeType}`);
    }

    return {
      ...result,
      errors,
      warnings,
    };
  }

  /**
   * Get validation error for API responses
   */
  static getValidationError(result: ValidationResult): ReturnType<typeof DicomErrorHandler.handleValidationError> | null {
    if (result.valid) return null;

    return DicomErrorHandler.handleValidationError(
      result.errors.join('; '),
      result.metadata
    );
  }
}
