/**
 * VNA Integration Layer
 * Phase 2: Abstract interface for multiple VNA systems
 * Supports Orthanc, AWS S3, Azure Blob, Cloud VNAs, and others
 */

import { VnaType } from '@prisma/client';
import { DicomServerService } from './dicom-server';
import { CloudImageStorageService } from './cloud-image-storage';

export interface VnaConfig {
  id: string;
  name: string;
  type: VnaType;
  endpoint?: string;
  aeTitle?: string;
  host?: string;
  port?: number;
  credentials?: any;
  bucket?: string;
  region?: string;
  pathPrefix?: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    location?: string; // Clinic location
    imageType?: string[]; // X-ray types
    patientId?: string; // Specific patient
    leadId?: string; // Specific lead
  };
  action: {
    vnaId: string; // Which VNA to route to
    compress?: boolean; // Whether to compress before routing
  };
}

export interface VnaUploadResult {
  success: boolean;
  vnaId: string;
  storagePath?: string;
  url?: string;
  error?: string;
}

export interface VnaQueryResult {
  success: boolean;
  studies?: any[];
  error?: string;
}

/**
 * Abstract VNA Interface
 */
export interface IVnaProvider {
  /**
   * Upload DICOM file to VNA
   */
  uploadDicom(buffer: Buffer, metadata: any, config: VnaConfig): Promise<VnaUploadResult>;

  /**
   * Query VNA for studies
   */
  queryStudies(query: any, config: VnaConfig): Promise<VnaQueryResult>;

  /**
   * Download DICOM file from VNA
   */
  downloadDicom(studyId: string, config: VnaConfig): Promise<Buffer | null>;

  /**
   * Test connectivity to VNA
   */
  testConnection(config: VnaConfig): Promise<{ success: boolean; error?: string }>;
}

/**
 * Orthanc VNA Provider
 */
export class OrthancVnaProvider implements IVnaProvider {
  async uploadDicom(buffer: Buffer, metadata: any, config: VnaConfig): Promise<VnaUploadResult> {
    try {
      // Use existing DicomServerService for Orthanc
      const baseUrl = config.endpoint || `http://${config.host}:${config.port || 8042}`;
      const auth = config.credentials?.username && config.credentials?.password
        ? Buffer.from(`${config.credentials.username}:${config.credentials.password}`).toString('base64')
        : null;

      const response = await fetch(`${baseUrl}/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/dicom',
          ...(auth ? { Authorization: `Basic ${auth}` } : {}),
        },
        body: buffer,
      });

      if (!response.ok) {
        throw new Error(`Orthanc upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        vnaId: config.id,
        storagePath: result.ID,
        url: `${baseUrl}/instances/${result.ID}`,
      };
    } catch (error: any) {
      return {
        success: false,
        vnaId: config.id,
        error: error.message || 'Upload failed',
      };
    }
  }

  async queryStudies(query: any, config: VnaConfig): Promise<VnaQueryResult> {
    try {
      const baseUrl = config.endpoint || `http://${config.host}:${config.port || 8042}`;
      const auth = config.credentials?.username && config.credentials?.password
        ? Buffer.from(`${config.credentials.username}:${config.credentials.password}`).toString('base64')
        : null;

      const response = await fetch(`${baseUrl}/studies`, {
        headers: {
          ...(auth ? { Authorization: `Basic ${auth}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Orthanc query failed: ${response.statusText}`);
      }

      const studies = await response.json();
      return {
        success: true,
        studies: Array.isArray(studies) ? studies : [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Query failed',
      };
    }
  }

  async downloadDicom(studyId: string, config: VnaConfig): Promise<Buffer | null> {
    try {
      const baseUrl = config.endpoint || `http://${config.host}:${config.port || 8042}`;
      const auth = config.credentials?.username && config.credentials?.password
        ? Buffer.from(`${config.credentials.username}:${config.credentials.password}`).toString('base64')
        : null;

      const response = await fetch(`${baseUrl}/instances/${studyId}/file`, {
        headers: {
          ...(auth ? { Authorization: `Basic ${auth}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading from Orthanc:', error);
      return null;
    }
  }

  async testConnection(config: VnaConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = config.endpoint || `http://${config.host}:${config.port || 8042}`;
      const auth = config.credentials?.username && config.credentials?.password
        ? Buffer.from(`${config.credentials.username}:${config.credentials.password}`).toString('base64')
        : null;

      const response = await fetch(`${baseUrl}/system`, {
        headers: {
          ...(auth ? { Authorization: `Basic ${auth}` } : {}),
        },
      });

      return {
        success: response.ok,
        error: response.ok ? undefined : `Connection failed: ${response.statusText}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }
}

/**
 * Cloud Storage VNA Provider (AWS S3, Azure Blob)
 */
export class CloudStorageVnaProvider implements IVnaProvider {
  async uploadDicom(buffer: Buffer, metadata: any, config: VnaConfig): Promise<VnaUploadResult> {
    try {
      const storageService = new CloudImageStorageService({
        provider: config.type === 'AWS_S3' ? 'aws' : 'azure',
        bucket: config.bucket,
        container: config.bucket, // Azure uses container
        region: config.region,
      });

      const path = config.pathPrefix 
        ? `${config.pathPrefix}/${metadata.patientId || 'unknown'}/${Date.now()}.dcm`
        : `dicom/${metadata.patientId || 'unknown'}/${Date.now()}.dcm`;

      // For cloud storage, we'll store the DICOM file directly
      // In production, you might want to compress it first
      const result = await storageService.uploadCompressedImages(
        `dicom-${Date.now()}`,
        buffer.slice(0, 1000), // Thumbnail (first 1KB)
        buffer.slice(0, 10000), // Preview (first 10KB)
        buffer, // Full DICOM file
        'application/dicom'
      );

      return {
        success: true,
        vnaId: config.id,
        storagePath: result.storagePaths.full,
        url: result.fullUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        vnaId: config.id,
        error: error.message || 'Upload failed',
      };
    }
  }

  async queryStudies(query: any, config: VnaConfig): Promise<VnaQueryResult> {
    // Cloud storage doesn't support DICOM query - would need metadata index
    return {
      success: false,
      error: 'Query not supported for cloud storage VNA',
    };
  }

  async downloadDicom(studyId: string, config: VnaConfig): Promise<Buffer | null> {
    // Would need to implement download from cloud storage
    return null;
  }

  async testConnection(config: VnaConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const storageService = new CloudImageStorageService({
        provider: config.type === 'AWS_S3' ? 'aws' : 'azure',
        bucket: config.bucket,
        container: config.bucket,
        region: config.region,
      });

      // Test by checking if we can get provider info
      const provider = storageService.getProvider();
      return {
        success: !!provider,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }
}

/**
 * VNA Manager - Routes to appropriate VNA based on rules
 */
export class VnaManager {
  private static providers: Map<VnaType, IVnaProvider> = new Map([
    ['ORTHANC', new OrthancVnaProvider()],
    ['AWS_S3', new CloudStorageVnaProvider()],
    ['AZURE_BLOB', new CloudStorageVnaProvider()],
  ]);

  /**
   * Get VNA provider for a given type
   */
  static getProvider(type: VnaType): IVnaProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`No provider found for VNA type: ${type}`);
    }
    return provider;
  }

  /**
   * Route DICOM file to appropriate VNA based on routing rules
   */
  static async routeDicom(
    buffer: Buffer,
    metadata: any,
    vnaConfigs: VnaConfig[],
    routingRules: RoutingRule[],
    context?: {
      location?: string;
      imageType?: string;
      patientId?: string;
      leadId?: string;
    }
  ): Promise<VnaUploadResult[]> {
    // Find matching VNA based on rules
    const matchedVna = this.findMatchingVna(vnaConfigs, routingRules, context);
    
    if (!matchedVna) {
      // Use default VNA
      const defaultVna = vnaConfigs.find(v => v.isDefault && v.isActive);
      if (!defaultVna) {
        throw new Error('No VNA configured and no default VNA found');
      }
      return this.uploadToVna(buffer, metadata, defaultVna);
    }

    return this.uploadToVna(buffer, metadata, matchedVna);
  }

  /**
   * Find matching VNA based on routing rules
   */
  private static findMatchingVna(
    vnaConfigs: VnaConfig[],
    routingRules: RoutingRule[],
    context?: {
      location?: string;
      imageType?: string;
      patientId?: string;
      leadId?: string;
    }
  ): VnaConfig | null {
    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...routingRules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const conditions = rule.conditions;
      let matches = true;

      // Check location condition
      if (conditions.location && context?.location !== conditions.location) {
        matches = false;
      }

      // Check image type condition
      if (conditions.imageType && conditions.imageType.length > 0) {
        if (!context?.imageType || !conditions.imageType.includes(context.imageType)) {
          matches = false;
        }
      }

      // Check patient condition
      if (conditions.patientId && context?.patientId !== conditions.patientId) {
        matches = false;
      }

      // Check lead condition
      if (conditions.leadId && context?.leadId !== conditions.leadId) {
        matches = false;
      }

      if (matches) {
        const vna = vnaConfigs.find(v => v.id === rule.action.vnaId && v.isActive);
        if (vna) {
          return vna;
        }
      }
    }

    return null;
  }

  /**
   * Upload to specific VNA
   */
  private static async uploadToVna(
    buffer: Buffer,
    metadata: any,
    vnaConfig: VnaConfig
  ): Promise<VnaUploadResult[]> {
    const provider = this.getProvider(vnaConfig.type);
    const result = await provider.uploadDicom(buffer, metadata, vnaConfig);
    return [result];
  }

  /**
   * Test VNA connection
   */
  static async testVnaConnection(config: VnaConfig): Promise<{ success: boolean; error?: string }> {
    const provider = this.getProvider(config.type);
    return provider.testConnection(config);
  }
}
