/**
 * DICOM Error Handler
 * Provides robust error handling and recovery for DICOM operations
 */

export enum DicomErrorType {
  PARSE_ERROR = 'PARSE_ERROR',
  PIXEL_DATA_ERROR = 'PIXEL_DATA_ERROR',
  CONVERSION_ERROR = 'CONVERSION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
}

export interface DicomError {
  type: DicomErrorType;
  message: string;
  originalError?: Error;
  recoverable: boolean;
  suggestions: string[];
  metadata?: Record<string, any>;
}

export class DicomErrorHandler {
  /**
   * Handle DICOM parsing errors with recovery suggestions
   */
  static handleParseError(error: Error, buffer?: Buffer): DicomError {
    const errorMessage = error.message.toLowerCase();
    
    // Check for common issues
    if (errorMessage.includes('preamble') || errorMessage.includes('dicom')) {
      return {
        type: DicomErrorType.PARSE_ERROR,
        message: 'Invalid DICOM file format. The file may be corrupted or not a valid DICOM file.',
        originalError: error,
        recoverable: false,
        suggestions: [
          'Verify the file is a valid DICOM file (.dcm or .dicom extension)',
          'Try re-exporting from the source system',
          'Check if the file is corrupted',
          'Contact support if the issue persists',
        ],
        metadata: {
          bufferSize: buffer?.length,
        },
      };
    }

    if (errorMessage.includes('pixel data')) {
      return {
        type: DicomErrorType.PIXEL_DATA_ERROR,
        message: 'Unable to extract pixel data from DICOM file.',
        originalError: error,
        recoverable: true,
        suggestions: [
          'The file may use an unsupported transfer syntax',
          'Try converting the file to a standard format',
          'Contact support with the file for analysis',
        ],
      };
    }

    // Generic parse error
    return {
      type: DicomErrorType.PARSE_ERROR,
      message: `Failed to parse DICOM file: ${error.message}`,
      originalError: error,
      recoverable: false,
      suggestions: [
        'Verify the file is a valid DICOM file',
        'Try uploading the file again',
        'Contact support if the issue persists',
      ],
    };
  }

  /**
   * Handle image conversion errors
   */
  static handleConversionError(error: Error, pixelData?: any): DicomError {
    return {
      type: DicomErrorType.CONVERSION_ERROR,
      message: `Failed to convert DICOM to image: ${error.message}`,
      originalError: error,
      recoverable: true,
      suggestions: [
        'Try adjusting window/level settings',
        'The image may be too large - try a smaller region',
        'Contact support if the issue persists',
      ],
      metadata: {
        hasPixelData: !!pixelData,
        pixelDataSize: pixelData?.pixelData?.length,
      },
    };
  }

  /**
   * Handle storage errors
   */
  static handleStorageError(error: Error): DicomError {
    return {
      type: DicomErrorType.STORAGE_ERROR,
      message: `Failed to store DICOM file: ${error.message}`,
      originalError: error,
      recoverable: true,
      suggestions: [
        'Check your internet connection',
        'Try uploading again',
        'The file may be too large',
        'Contact support if the issue persists',
      ],
    };
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: Error): DicomError {
    return {
      type: DicomErrorType.NETWORK_ERROR,
      message: `Network error: ${error.message}`,
      originalError: error,
      recoverable: true,
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Check firewall settings',
        'Contact support if the issue persists',
      ],
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(message: string, metadata?: Record<string, any>): DicomError {
    return {
      type: DicomErrorType.VALIDATION_ERROR,
      message,
      recoverable: false,
      suggestions: [
        'Verify all required fields are provided',
        'Check file format and size',
        'Contact support if the issue persists',
      ],
      metadata,
    };
  }

  /**
   * Handle unsupported format errors
   */
  static handleUnsupportedFormat(format: string): DicomError {
    return {
      type: DicomErrorType.UNSUPPORTED_FORMAT,
      message: `Unsupported DICOM format: ${format}`,
      recoverable: false,
      suggestions: [
        'Convert the file to a supported format',
        'Contact support to request format support',
        'Check documentation for supported formats',
      ],
      metadata: {
        format,
      },
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: DicomError): string {
    const messages: Record<DicomErrorType, string> = {
      [DicomErrorType.PARSE_ERROR]: 'Unable to read the DICOM file. Please verify it is a valid DICOM file.',
      [DicomErrorType.PIXEL_DATA_ERROR]: 'Unable to extract image data from the DICOM file.',
      [DicomErrorType.CONVERSION_ERROR]: 'Unable to convert the DICOM file to an image.',
      [DicomErrorType.STORAGE_ERROR]: 'Unable to save the file. Please try again.',
      [DicomErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your connection.',
      [DicomErrorType.VALIDATION_ERROR]: 'Invalid file or missing required information.',
      [DicomErrorType.UNSUPPORTED_FORMAT]: 'This file format is not currently supported.',
    };

    return messages[error.type] || 'An error occurred while processing the DICOM file.';
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: DicomError): boolean {
    return error.recoverable;
  }

  /**
   * Log error for monitoring
   */
  static logError(error: DicomError, context?: Record<string, any>) {
    console.error('[DICOM Error]', {
      type: error.type,
      message: error.message,
      recoverable: error.recoverable,
      suggestions: error.suggestions,
      metadata: error.metadata,
      context,
      originalError: error.originalError?.stack,
    });

    // In production, send to error tracking service (e.g., Sentry)
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error.originalError || new Error(error.message), {
    //     tags: { errorType: error.type },
    //     extra: { ...error.metadata, ...context },
    //   });
    // }
  }
}
