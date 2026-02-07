/**
 * Integration Tests for DICOM Batch Processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DicomBatchProcessor } from '@/lib/dental/dicom-batch-processor';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    dentalXRay: {
      create: vi.fn().mockResolvedValue({ id: 'mock-xray-id' }),
    },
  },
}));

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue(Buffer.from('mock-key')),
  },
  randomBytes: vi.fn().mockReturnValue(Buffer.from('mock-key')),
}));

vi.mock('@/lib/storage/canadian-storage-service', () => ({
  CanadianStorageService: vi.fn().mockImplementation(() => ({
    uploadDocument: vi.fn().mockResolvedValue({
      storagePath: 'mock/path',
      encryptedPath: 'mock/path',
      keyId: 'mock-key',
    }),
  })),
}));

describe('DicomBatchProcessor', () => {
  beforeEach(() => {
    // Clear any existing jobs
    vi.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new batch job', () => {
      const files = [
        {
          file: new File([''], 'test1.dcm'),
          filename: 'test1.dcm',
          mimeType: 'application/dicom',
          metadata: {
            leadId: 'lead-1',
            userId: 'user-1',
            xrayType: 'PANORAMIC',
            dateTaken: new Date().toISOString(),
          },
        },
      ];

      const jobId = DicomBatchProcessor.createJob(files);
      
      expect(jobId).toBeTruthy();
      expect(jobId).toContain('batch-');
    });

    it('should create job with multiple files', () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        file: new File([''], `test${i}.dcm`),
        filename: `test${i}.dcm`,
        mimeType: 'application/dicom',
        metadata: {
          leadId: 'lead-1',
          userId: 'user-1',
          xrayType: 'PANORAMIC',
          dateTaken: new Date().toISOString(),
        },
      }));

      const jobId = DicomBatchProcessor.createJob(files);
      const job = DicomBatchProcessor.getJob(jobId);
      
      expect(job).toBeTruthy();
      expect(job?.files.length).toBe(5);
      expect(job?.status).toBe('pending');
    });
  });

  describe('getJob', () => {
    it('should retrieve job by ID', () => {
      const files = [
        {
          file: new File([''], 'test.dcm'),
          filename: 'test.dcm',
          metadata: {
            leadId: 'lead-1',
            userId: 'user-1',
            xrayType: 'PANORAMIC',
            dateTaken: new Date().toISOString(),
          },
        },
      ];

      const jobId = DicomBatchProcessor.createJob(files);
      const job = DicomBatchProcessor.getJob(jobId);
      
      expect(job).toBeTruthy();
      expect(job?.id).toBe(jobId);
    });

    it('should return null for non-existent job', () => {
      const job = DicomBatchProcessor.getJob('non-existent');
      expect(job).toBeNull();
    });
  });

  describe('cancelJob', () => {
    it('should cancel a pending job', () => {
      const files = [
        {
          file: new File([''], 'test.dcm'),
          filename: 'test.dcm',
          metadata: {
            leadId: 'lead-1',
            userId: 'user-1',
            xrayType: 'PANORAMIC',
            dateTaken: new Date().toISOString(),
          },
        },
      ];

      const jobId = DicomBatchProcessor.createJob(files);
      const cancelled = DicomBatchProcessor.cancelJob(jobId);
      
      expect(cancelled).toBe(true);
      
      const job = DicomBatchProcessor.getJob(jobId);
      expect(job?.status).toBe('failed');
    });
  });
});
