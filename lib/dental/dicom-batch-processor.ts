/**
 * DICOM Batch Processor
 * Handles processing of multiple DICOM files in batches
 */

import { DicomParser } from './dicom-parser';
import { DicomToImageConverter } from './dicom-to-image';
import { DicomValidator } from './dicom-validator';
import { DicomErrorHandler } from './dicom-error-handler';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';

export interface BatchJob {
  id: string;
  files: Array<{
    file: File | Buffer;
    filename: string;
    mimeType?: string;
    metadata?: {
      leadId: string;
      userId: string;
      xrayType: string;
      dateTaken: string;
      teethIncluded?: string[];
      notes?: string;
    };
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: Array<{
    filename: string;
    success: boolean;
    xrayId?: string;
    error?: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

export class DicomBatchProcessor {
  private static jobs: Map<string, BatchJob> = new Map();
  private static readonly MAX_CONCURRENT = 3; // Process 3 files at a time
  private static isProcessing = false;

  /**
   * Create a new batch job
   */
  static createJob(files: BatchJob['files']): string {
    const jobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: BatchJob = {
      id: jobId,
      files,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.processQueue();

    return jobId;
  }

  /**
   * Get job status
   */
  static getJob(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Process queued jobs
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingJobs = Array.from(this.jobs.values()).filter(
        (job) => job.status === 'pending' || job.status === 'processing'
      );

      for (const job of pendingJobs) {
        if (job.status === 'pending') {
          job.status = 'processing';
          await this.processJob(job);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single batch job
   */
  private static async processJob(job: BatchJob): Promise<void> {
    const storageService = new CanadianStorageService();
    const totalFiles = job.files.length;

    for (let i = 0; i < job.files.length; i++) {
      const fileItem = job.files[i];
      const result: {
        filename: string;
        success: boolean;
        xrayId?: string;
        error?: string;
      } = {
        filename: fileItem.filename,
        success: false,
      };

      try {
        // Convert File to Buffer if needed
        let buffer: Buffer;
        if (fileItem.file instanceof File) {
          buffer = Buffer.from(await fileItem.file.arrayBuffer());
        } else {
          buffer = fileItem.file;
        }

        // Validate
        const validation = DicomValidator.validateFile(
          buffer,
          fileItem.filename,
          fileItem.mimeType
        );

        if (!validation.valid) {
          const error = DicomValidator.getValidationError(validation);
          result.error = error ? DicomErrorHandler.getUserFriendlyMessage(error) : 'Validation failed';
          job.results.push(result);
          job.progress = ((i + 1) / totalFiles) * 100;
          continue;
        }

        // Process DICOM
        if (!fileItem.metadata) {
          result.error = 'Missing metadata';
          job.results.push(result);
          job.progress = ((i + 1) / totalFiles) * 100;
          continue;
        }

        const { leadId, userId, xrayType, dateTaken, teethIncluded, notes } = fileItem.metadata;
        const encryptionKey = require('crypto').randomBytes(32).toString('hex');

        // Parse DICOM
        const { metadata, pixelData } = DicomParser.parseDicom(buffer);

        // Store DICOM file
        const uploadResult = await storageService.uploadDocument(
          buffer,
          fileItem.filename,
          fileItem.mimeType || 'application/dicom',
          encryptionKey
        );

        // Convert to image
        const optimalWindow = DicomToImageConverter.getOptimalWindowLevel(xrayType);
        const imageBuffer = await DicomToImageConverter.convertToImage(pixelData, {
          windowCenter: optimalWindow.windowCenter,
          windowWidth: optimalWindow.windowWidth,
          outputFormat: 'png',
          maxDimension: 2048,
        });

        // Store image
        const imageUploadResult = await storageService.uploadDocument(
          imageBuffer,
          `${fileItem.filename.replace(/\.(dcm|dicom)$/i, '')}.png`,
          'image/png',
          encryptionKey
        );

        // Create X-ray record
        const xray = await (prisma as any).dentalXRay.create({
          data: {
            leadId,
            userId,
            dicomFile: uploadResult.storagePath,
            imageFile: imageUploadResult.storagePath,
            imageUrl: `/api/dental/xrays/temp/${Date.now()}`,
            xrayType,
            teethIncluded: teethIncluded || [],
            dateTaken: new Date(dateTaken),
            notes: notes || null,
          },
        });

        result.success = true;
        result.xrayId = xray.id;
      } catch (error) {
        const dicomError = DicomErrorHandler.handleParseError(error as Error);
        DicomErrorHandler.logError(dicomError);
        result.error = DicomErrorHandler.getUserFriendlyMessage(dicomError);
      }

      job.results.push(result);
      job.progress = ((i + 1) / totalFiles) * 100;
    }

    job.status = 'completed';
    job.completedAt = new Date();
  }

  /**
   * Cancel a job
   */
  static cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed') return false;

    job.status = 'failed';
    return true;
  }
}

// Import prisma
import { prisma } from '@/lib/db';
