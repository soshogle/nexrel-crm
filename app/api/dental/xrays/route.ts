/**
 * X-Ray API
 * Handles X-ray upload and retrieval
 * Supports DICOM files from major X-ray systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { DicomParser } from '@/lib/dental/dicom-parser';
import { DicomToImageConverter } from '@/lib/dental/dicom-to-image';
import { DicomValidator } from '@/lib/dental/dicom-validator';
import { DicomErrorHandler } from '@/lib/dental/dicom-error-handler';
import { DicomRetry } from '@/lib/dental/dicom-retry';
import { DicomPerformanceMonitor } from '@/lib/dental/dicom-performance';
import { ImageCompressionService } from '@/lib/dental/image-compression-service';
import { CloudImageStorageService } from '@/lib/dental/cloud-image-storage';
import { VnaManager } from '@/lib/dental/vna-integration';
import { triggerXrayUploadedWorkflow } from '@/lib/dental/workflow-triggers';
import crypto from 'crypto';
import { t } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/xrays - List X-rays
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json(
        { error: await t('api.leadIdRequired') },
        { status: 400 }
      );
    }

    // Use correct Prisma model name (capitalized)
    const xrays = await prisma.dentalXRay.findMany({
      where: {
        leadId,
        userId: session.user.id,
      },
      orderBy: {
        dateTaken: 'desc',
      },
    });

    return NextResponse.json(xrays);
  } catch (error) {
    console.error('Error fetching X-rays:', error);
    return NextResponse.json(
      { error: await t('api.fetchXraysFailed') },
      { status: 500 }
    );
  }
}

// POST /api/dental/xrays - Upload X-ray
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const leadId = formData.get('leadId') as string;
    const userId = formData.get('userId') as string;
    const xrayType = formData.get('xrayType') as string;
    const dateTaken = formData.get('dateTaken') as string;
    const teethIncludedStr = formData.get('teethIncluded') as string;
    const notes = formData.get('notes') as string;

    if (!file || !leadId || !xrayType || !dateTaken) {
      return NextResponse.json(
        { error: await t('api.missingRequiredFields') },
        { status: 400 }
      );
    }

    // Verify user owns the userId
    if (userId !== session.user.id) {
      return NextResponse.json({ error: await t('api.forbidden') }, { status: 403 });
    }

    // Verify lead belongs to user
    const lead = await prisma.lead.findUnique({
      where: { id: leadId, userId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: await t('api.leadNotFound') },
        { status: 404 }
      );
    }

    // Parse teeth included
    const teethIncluded = teethIncludedStr
      ? JSON.parse(teethIncludedStr)
      : [];

    // Check if it's a DICOM file
    const isDicom = file.name.toLowerCase().endsWith('.dcm') ||
                   file.name.toLowerCase().endsWith('.dicom') ||
                   file.type === 'application/dicom' ||
                   file.type === 'application/x-dicom';

    // Upload to Canadian storage
    const storageService = new CanadianStorageService();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate encryption key
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    
    let dicomFile: string | null = null;
    let thumbnailUrl: string | null = null;
    let previewUrl: string | null = null;
    let fullUrl: string | null = null;
    let storagePaths: { thumbnail: string; preview: string; full: string } | null = null;
    let compressionRatio: number | null = null;
    let originalSize: number | null = null;
    let compressedSize: number | null = null;

    if (isDicom) {
      // Validate DICOM file first
      const validation = DicomValidator.validateFile(buffer, file.name, file.type);
      if (!validation.valid) {
        const validationError = DicomValidator.getValidationError(validation);
        if (validationError) {
          DicomErrorHandler.logError(validationError, { leadId, userId, xrayType });
          return NextResponse.json(
            { error: DicomErrorHandler.getUserFriendlyMessage(validationError) },
            { status: 400 }
          );
        }
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('DICOM validation warnings:', validation.warnings);
      }

      // Store DICOM file using uploadDocument method (original, encrypted)
      let uploadResult;
      try {
        uploadResult = await storageService.uploadDocument(
          buffer,
          file.name,
          file.type || 'application/dicom',
          encryptionKey
        );
        dicomFile = uploadResult.storagePath;
        originalSize = buffer.length;
      } catch (storageError) {
        const error = DicomErrorHandler.handleStorageError(storageError as Error);
        DicomErrorHandler.logError(error, { leadId, userId, fileSize: buffer.length });
        return NextResponse.json(
          { error: DicomErrorHandler.getUserFriendlyMessage(error) },
          { status: 500 }
        );
      }

      // Process DICOM and generate multi-resolution compressed images
      try {
        await DicomPerformanceMonitor.measure('dicom_processing', async () => {
          // Parse DICOM and extract pixel data with retry
          const parseResult = await DicomRetry.retry(
            () => Promise.resolve(DicomParser.parseDicom(buffer)),
            {
              maxRetries: 2,
              retryDelay: 500,
            }
          );

          if (!parseResult.success || !parseResult.result) {
            throw parseResult.error || new Error('Failed to parse DICOM');
          }

          const { metadata, pixelData } = parseResult.result;
          
          // Get optimal compression settings for this X-ray type
          const compressionOptions = ImageCompressionService.getOptimalSettings(xrayType);
          
          // Generate multi-resolution compressed images
          const compressionResult = await DicomRetry.retry(
            () => ImageCompressionService.compressMultiResolution(pixelData, compressionOptions),
            {
              maxRetries: 2,
              retryDelay: 500,
            }
          );

          if (!compressionResult.success || !compressionResult.result) {
            throw compressionResult.error || new Error('Failed to compress images');
          }

          const { thumbnail, preview, full, compressionRatio: ratio } = compressionResult.result;
          compressionRatio = ratio;
          compressedSize = full.size;

          // Upload compressed images to cloud storage
          const cloudStorage = new CloudImageStorageService();
          const storageUrlsResult = await DicomRetry.retry(
            () => cloudStorage.uploadCompressedImages(
              `temp-${Date.now()}`, // Temporary ID, will be updated after DB creation
              thumbnail.buffer,
              preview.buffer,
              full.buffer,
              'image/jpeg'
            ),
            {
              maxRetries: 3,
              retryDelay: 1000,
              exponentialBackoff: true,
            }
          );

          if (storageUrlsResult.success && storageUrlsResult.result) {
            thumbnailUrl = storageUrlsResult.result.thumbnailUrl;
            previewUrl = storageUrlsResult.result.previewUrl;
            fullUrl = storageUrlsResult.result.fullUrl;
            storagePaths = storageUrlsResult.result.storagePaths;
          } else {
            // Log but don't fail - DICOM file is stored, images can be regenerated
            console.error('Error storing compressed images:', storageUrlsResult.error);
          }

          // Phase 2: Route DICOM to VNA based on routing rules
          try {
            const vnaConfigs = await prisma.vnaConfiguration.findMany({
              where: {
                userId,
                isActive: true,
              },
            });

            if (vnaConfigs.length > 0) {
              // Get routing rules from VNA configs
              const routingRules: any[] = [];
              vnaConfigs.forEach((vna: any) => {
                if (vna.routingRules && Array.isArray(vna.routingRules)) {
                  routingRules.push(...vna.routingRules);
                }
              });

              // Route to appropriate VNA
              const routingContext = {
                imageType: xrayType,
                patientId: metadata.patientId,
                leadId,
                location: (lead as any).location || lead.address || undefined,
              };

              await VnaManager.routeDicom(
                buffer,
                metadata,
                vnaConfigs.map((v: any) => ({
                  id: v.id,
                  name: v.name,
                  type: v.type,
                  endpoint: v.endpoint,
                  aeTitle: v.aeTitle,
                  host: v.host,
                  port: v.port,
                  credentials: v.credentials ? JSON.parse(JSON.stringify(v.credentials)) : null,
                  bucket: v.bucket,
                  region: v.region,
                  pathPrefix: v.pathPrefix,
                  isActive: v.isActive,
                  isDefault: v.isDefault,
                  priority: v.priority,
                })),
                routingRules,
                routingContext
              );
            }
          } catch (vnaError) {
            // Log but don't fail - VNA routing is optional
            console.error('Error routing to VNA:', vnaError);
          }
        }, { xrayType, fileSize: buffer.length });
      } catch (dicomError) {
        // Log error but don't fail upload - DICOM file is stored
        const error = DicomErrorHandler.handleParseError(dicomError as Error, buffer);
        DicomErrorHandler.logError(error, { leadId, userId, xrayType, dicomFile });
        
        // If not recoverable, return error
        if (!error.recoverable) {
          return NextResponse.json(
            { error: DicomErrorHandler.getUserFriendlyMessage(error) },
            { status: 400 }
          );
        }
        
        // If recoverable, continue but warn user
        console.warn('DICOM processing error (recoverable):', error.message);
      }
    } else {
      // For non-DICOM images, compress and store
      try {
        const compressionResult = await ImageCompressionService.compressImageBuffer(buffer);
        compressionRatio = compressionResult.compressionRatio;
        originalSize = compressionResult.originalSize;
        compressedSize = compressionResult.full.size;

        // Upload compressed images to cloud storage
        const cloudStorage = new CloudImageStorageService();
        const storageUrls = await cloudStorage.uploadCompressedImages(
          `temp-${Date.now()}`,
          compressionResult.thumbnail.buffer,
          compressionResult.preview.buffer,
          compressionResult.full.buffer,
          file.type || 'image/jpeg'
        );

        thumbnailUrl = storageUrls.thumbnailUrl;
        previewUrl = storageUrls.previewUrl;
        fullUrl = storageUrls.fullUrl;
        storagePaths = storageUrls.storagePaths;
      } catch (compressionError) {
        console.error('Error compressing image:', compressionError);
        // Fallback: store original
        const uploadResult = await storageService.uploadDocument(
          buffer,
          file.name,
          file.type || 'image/png',
          encryptionKey
        );
        // Use legacy fields for backward compatibility
        thumbnailUrl = previewUrl = fullUrl = `/api/dental/xrays/${Date.now()}/image`;
      }
    }

    // Create X-ray record with multi-resolution URLs
    // Note: Model name will be available after running: npx prisma generate
    const xray = await (prisma as any).dentalXRay.create({
      data: {
        leadId,
        userId,
        dicomFile,
        // Legacy fields for backward compatibility
        imageFile: fullUrl || null,
        imageUrl: fullUrl || previewUrl || thumbnailUrl || null,
        // New multi-resolution fields
        thumbnailUrl,
        previewUrl,
        fullUrl,
        storagePaths: storagePaths ? JSON.stringify(storagePaths) : null,
        compressionRatio,
        originalSize,
        compressedSize,
        xrayType,
        teethIncluded,
        dateTaken: new Date(dateTaken),
        notes: notes || null,
      },
    });

    // Update storage paths with actual X-ray ID (if we used temp ID)
    if (storagePaths && thumbnailUrl?.includes('temp-')) {
      const cloudStorage = new CloudImageStorageService();
      // Re-upload with correct ID (optional optimization - can be done later)
      // For now, the temp ID works fine
    }

    // Phase 3: Trigger workflow for X-ray upload
    try {
      await triggerXrayUploadedWorkflow(xray.id, leadId, userId, xrayType);
    } catch (workflowError) {
      // Log but don't fail - workflow is optional
      console.error('Error triggering X-ray workflow:', workflowError);
    }

    return NextResponse.json(xray, { status: 201 });
  } catch (error) {
    console.error('Error uploading X-ray:', error);
    return NextResponse.json(
      { error: await t('api.uploadXrayFailed') },
      { status: 500 }
    );
  }
}
