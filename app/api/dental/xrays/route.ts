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

    // Note: Model name will be available after running: npx prisma generate
    // For now, using type assertion to allow build to pass
    const xrays = await (prisma as any).dentalXRay.findMany({
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
    let imageFile: string | null = null;
    let imageUrl: string | null = null;

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

      // Store DICOM file using uploadDocument method
      let uploadResult;
      try {
        uploadResult = await storageService.uploadDocument(
          buffer,
          file.name,
          file.type || 'application/dicom',
          encryptionKey
        );
        dicomFile = uploadResult.storagePath;
      } catch (storageError) {
        const error = DicomErrorHandler.handleStorageError(storageError as Error);
        DicomErrorHandler.logError(error, { leadId, userId, fileSize: buffer.length });
        return NextResponse.json(
          { error: DicomErrorHandler.getUserFriendlyMessage(error) },
          { status: 500 }
        );
      }

      // Process DICOM and generate preview with retry and performance tracking
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
          
          // Get optimal window/level for this X-ray type
          const optimalWindow = DicomToImageConverter.getOptimalWindowLevel(xrayType);
          
          // Convert DICOM to PNG image for preview with retry
          const convertResult = await DicomRetry.retry(
            () => DicomToImageConverter.convertToImage(pixelData, {
              windowCenter: optimalWindow.windowCenter,
              windowWidth: optimalWindow.windowWidth,
              outputFormat: 'png',
              maxDimension: 2048,
            }),
            {
              maxRetries: 2,
              retryDelay: 500,
            }
          );

          if (!convertResult.success || !convertResult.result) {
            throw convertResult.error || new Error('Failed to convert DICOM to image');
          }

          const imageBuffer = convertResult.result;

          // Upload converted image with retry
          const uploadResult = await DicomRetry.retry(
            () => storageService.uploadDocument(
              imageBuffer,
              `${file.name.replace(/\.(dcm|dicom)$/i, '')}.png`,
              'image/png',
              encryptionKey
            ),
            {
              maxRetries: 3,
              retryDelay: 1000,
              exponentialBackoff: true,
            }
          );

          if (uploadResult.success && uploadResult.result) {
            imageFile = uploadResult.result.storagePath;
            imageUrl = `/api/dental/xrays/${Date.now()}/image`;
          } else {
            // Log but don't fail - DICOM file is stored, preview can be regenerated
            console.error('Error storing preview image:', uploadResult.error);
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
      // Store as regular image
      const uploadResult = await storageService.uploadDocument(
        buffer,
        file.name,
        file.type || 'image/png',
        encryptionKey
      );
      imageFile = uploadResult.storagePath;

      // Generate preview URL - use API endpoint
      imageUrl = `/api/dental/xrays/${Date.now()}/image`;
    }

    // Create X-ray record
    // Note: Model name will be available after running: npx prisma generate
    const xray = await (prisma as any).dentalXRay.create({
      data: {
        leadId,
        userId,
        dicomFile,
        imageFile,
        imageUrl: imageUrl || (imageFile ? `/api/dental/xrays/temp/${Date.now()}` : null),
        xrayType,
        teethIncluded,
        dateTaken: new Date(dateTaken),
        notes: notes || null,
      },
    });

    // Update with proper image URL if needed
    if (imageFile && !imageUrl) {
      const updatedXray = await (prisma as any).dentalXRay.update({
        where: { id: xray.id },
        data: { imageUrl: `/api/dental/xrays/${xray.id}/image` },
      });
      return NextResponse.json(updatedXray, { status: 201 });
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
