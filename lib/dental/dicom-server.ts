/**
 * DICOM Server Integration Service
 * Handles integration with Orthanc DICOM server for C-STORE, C-FIND, C-MOVE
 */

import { prisma } from '@/lib/db';
import { DicomParser } from './dicom-parser';
import { DicomToImageConverter } from './dicom-to-image';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { DicomErrorHandler } from './dicom-error-handler';

export interface DicomServerConfig {
  id: string;
  name: string;
  aeTitle: string;
  host: string;
  port: number;
  isActive: boolean;
  userId: string;
}

export interface DicomStudy {
  studyInstanceUid: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  studyTime?: string;
  modality: string;
  studyDescription?: string;
  seriesCount: number;
  instanceCount: number;
}

export class DicomServerService {
  private static readonly ORTHANC_BASE_URL = process.env.ORTHANC_BASE_URL || 'http://localhost:8042';
  private static readonly ORTHANC_USERNAME = process.env.ORTHANC_USERNAME || 'orthanc';
  private static readonly ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD || 'orthanc';

  /**
   * Get Orthanc authentication header
   */
  private static getAuthHeader(): string {
    const credentials = Buffer.from(`${this.ORTHANC_USERNAME}:${this.ORTHANC_PASSWORD}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Handle incoming C-STORE request (webhook from Orthanc)
   * This is called when Orthanc receives a new DICOM file
   */
  static async handleCStoreWebhook(instanceId: string, userId: string): Promise<void> {
    try {
      // Download DICOM file from Orthanc
      const dicomBuffer = await this.downloadInstance(instanceId);
      
      // Parse DICOM metadata
      const { metadata } = DicomParser.parseDicom(dicomBuffer);
      
      // Find matching patient by Patient ID or Name
      const lead = await this.findPatient(metadata.patientId, metadata.patientName, userId);
      
      if (!lead) {
        console.warn(`[DICOM Server] Patient not found for DICOM: ${metadata.patientId || metadata.patientName}`);
        // Could create a pending import record here
        return;
      }

      // Determine X-ray type from modality
      const xrayType = this.mapModalityToXrayType(metadata.modality || '');
      
      // Process and store DICOM
      await this.processAndStoreDicom(
        dicomBuffer,
        lead.id,
        userId,
        xrayType,
        metadata,
        instanceId
      );
    } catch (error) {
      console.error('[DICOM Server] Error handling C-STORE webhook:', error);
      DicomErrorHandler.logError(
        DicomErrorHandler.handleNetworkError(error as Error),
        { instanceId, userId }
      );
    }
  }

  /**
   * Download DICOM instance from Orthanc
   */
  private static async downloadInstance(instanceId: string): Promise<Buffer> {
    const response = await fetch(`${this.ORTHANC_BASE_URL}/instances/${instanceId}/file`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download instance: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Find patient by Patient ID or Name
   */
  private static async findPatient(
    patientId: string | undefined,
    patientName: string | undefined,
    userId: string
  ) {
    // Try Patient ID first
    if (patientId) {
      const lead = await prisma.lead.findFirst({
        where: {
          userId,
          // In production, you'd have a patientId field or match via email/phone
          // For now, this is a placeholder
        },
      });
      if (lead) return lead;
    }

    // Try Patient Name
    if (patientName) {
      // Parse name (format: "LAST^FIRST^MIDDLE")
      const nameParts = patientName.split('^');
      const lastName = nameParts[0];
      const firstName = nameParts[1];

      const lead = await prisma.lead.findFirst({
        where: {
          userId,
          OR: [
            { contactPerson: { contains: firstName, mode: 'insensitive' } },
            { contactPerson: { contains: lastName, mode: 'insensitive' } },
            { businessName: { contains: firstName, mode: 'insensitive' } },
            { businessName: { contains: lastName, mode: 'insensitive' } },
          ],
        },
      });

      if (lead) return lead;
    }

    return null;
  }

  /**
   * Map DICOM modality to X-ray type
   */
  private static mapModalityToXrayType(modality: string): string {
    const modalityMap: Record<string, string> = {
      'PX': 'PANORAMIC',
      'XC': 'BITEWING',
      'XA': 'PERIAPICAL',
      'CT': 'CBCT',
      'DX': 'PERIAPICAL',
    };

    return modalityMap[modality.toUpperCase()] || 'PANORAMIC';
  }

  /**
   * Process and store DICOM file
   */
  private static async processAndStoreDicom(
    buffer: Buffer,
    leadId: string,
    userId: string,
    xrayType: string,
    metadata: any,
    instanceId: string
  ): Promise<void> {
    const storageService = new CanadianStorageService();
    const encryptionKey = require('crypto').randomBytes(32).toString('hex');

    // Store DICOM file
    const uploadResult = await storageService.uploadDocument(
      buffer,
      `dicom/${instanceId}.dcm`,
      'application/dicom',
      encryptionKey
    );

    // Parse and convert to image
    const { pixelData } = DicomParser.parseDicom(buffer);
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
      `dicom/${instanceId}.png`,
      'image/png',
      encryptionKey
    );

    // Create X-ray record
    await (prisma as any).dentalXRay.create({
      data: {
        leadId,
        userId,
        dicomFile: uploadResult.storagePath,
        imageFile: imageUploadResult.storagePath,
        imageUrl: `/api/dental/xrays/temp/${Date.now()}`,
        xrayType,
        teethIncluded: [],
        dateTaken: metadata.studyDate ? new Date(metadata.studyDate) : new Date(),
        notes: `Auto-imported from DICOM server (Instance: ${instanceId})`,
      },
    });
  }

  /**
   * Query remote DICOM systems (C-FIND)
   */
  static async queryRemoteStudies(
    serverConfig: DicomServerConfig,
    query: {
      patientId?: string;
      patientName?: string;
      studyDate?: string;
      modality?: string;
    }
  ): Promise<DicomStudy[]> {
    // In production, this would use DICOM C-FIND protocol
    // For now, using Orthanc REST API as a proxy
    try {
      const orthancQuery: any = {};
      
      if (query.patientId) {
        orthancQuery['PatientID'] = query.patientId;
      }
      if (query.patientName) {
        orthancQuery['PatientName'] = query.patientName;
      }
      if (query.studyDate) {
        orthancQuery['StudyDate'] = query.studyDate;
      }
      if (query.modality) {
        orthancQuery['Modality'] = query.modality;
      }

      const response = await fetch(`${this.ORTHANC_BASE_URL}/tools/find`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          Level: 'Study',
          Query: orthancQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`C-FIND query failed: ${response.statusText}`);
      }

      const studyIds = await response.json();
      
      // Fetch study details
      const studies: DicomStudy[] = [];
      for (const studyId of studyIds) {
        const studyDetails = await this.getStudyDetails(studyId);
        if (studyDetails) {
          studies.push(studyDetails);
        }
      }

      return studies;
    } catch (error) {
      console.error('[DICOM Server] Error querying remote studies:', error);
      throw error;
    }
  }

  /**
   * Get study details from Orthanc
   */
  private static async getStudyDetails(studyId: string): Promise<DicomStudy | null> {
    try {
      const response = await fetch(`${this.ORTHANC_BASE_URL}/studies/${studyId}`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        return null;
      }

      const study = await response.json();
      
      return {
        studyInstanceUid: study.MainDicomTags.StudyInstanceUID || studyId,
        patientId: study.MainDicomTags.PatientID || '',
        patientName: study.MainDicomTags.PatientName || '',
        studyDate: study.MainDicomTags.StudyDate || '',
        studyTime: study.MainDicomTags.StudyTime,
        modality: study.MainDicomTags.ModalitiesInStudy?.[0] || '',
        studyDescription: study.MainDicomTags.StudyDescription,
        seriesCount: study.Series?.length || 0,
        instanceCount: study.Instances?.length || 0,
      };
    } catch (error) {
      console.error('[DICOM Server] Error fetching study details:', error);
      return null;
    }
  }

  /**
   * Import study from remote DICOM system (C-MOVE)
   */
  static async importStudy(
    studyInstanceUid: string,
    leadId: string,
    userId: string
  ): Promise<void> {
    try {
      // Download all instances in the study
      const studyDetails = await this.getStudyDetails(studyInstanceUid);
      if (!studyDetails) {
        throw new Error('Study not found');
      }

      // For each instance, download and process
      // In production, this would use C-MOVE or download via Orthanc API
      const response = await fetch(`${this.ORTHANC_BASE_URL}/studies/${studyInstanceUid}`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      const study = await response.json();
      
      // Process each instance
      for (const instanceId of study.Instances || []) {
        await this.handleCStoreWebhook(instanceId, userId);
      }
    } catch (error) {
      console.error('[DICOM Server] Error importing study:', error);
      throw error;
    }
  }
}
