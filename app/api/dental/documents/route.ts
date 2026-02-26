/**
 * Dental Document Management API (Law 25 Compliant)
 * Handles document upload, download, and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { ConsentService } from '@/lib/storage/consent-service';
import { AccessAuditService } from '@/lib/storage/access-audit-service';
import { generateEncryptionKey } from '@/lib/docpen/security';
import { DocumentType, DocumentAccessLevel, ConsentType } from '@prisma/client';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const storageService = new CanadianStorageService();
const consentService = new ConsentService();
const auditService = new AccessAuditService();

// POST - Upload document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const leadId = formData.get('leadId') as string | null;
    const clinicId = formData.get('clinicId') as string | null;
    const documentType = formData.get('documentType') as DocumentType | null;
    const category = formData.get('category') as string | null;
    const description = formData.get('description') as string | null;
    const tags = formData.get('tags') as string | null;
    const consentId = formData.get('consentId') as string | null;
    const accessLevel = (formData.get('accessLevel') as DocumentAccessLevel) || 'RESTRICTED';

    if (!file) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    if (!leadId) {
      return apiErrors.badRequest(await t('api.leadIdRequired'));
    }

    // Check consent (Law 25 requirement)
    if (!consentId) {
      // Check if valid consent exists
      const hasConsent = await consentService.hasValidConsent(
        leadId,
        session.user.id,
        ConsentType.DATA_COLLECTION
      );

      if (!hasConsent) {
        return apiErrors.forbidden(await t('api.missingRequiredFields'));
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate encryption key
    const encryptionKey = generateEncryptionKey();

    // Upload to Canadian storage
    const uploadResult = await storageService.uploadDocument(
      buffer,
      file.name,
      file.type,
      encryptionKey
    );

    // Calculate retention expiry (7 years for medical records)
    const retentionExpiry = new Date();
    retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7);

    // Parse tags
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Create document record
    const createData: any = {
      userId: session.user.id,
      leadId,
      documentType: documentType || 'OTHER',
      category: category || null,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      encryptedStoragePath: uploadResult.storagePath,
      encryptionKeyId: uploadResult.keyId,
      consentId: consentId || null,
      accessLevel,
      createdBy: session.user.id,
      retentionExpiry,
      description: description || null,
      tags: tagsArray,
      metadata: {
        originalFileName: file.name,
        uploadedBy: session.user.id,
        uploadDate: new Date().toISOString(),
      },
    };
    if (clinicId) {
      createData.clinicId = clinicId;
    }
    const db = getRouteDb(session);
    const document = await db.patientDocument.create({
      data: createData,
    });

    // Log access
    await auditService.logAccess(
      document.id,
      session.user.id,
      'VIEW',
      'Document upload',
      request
    );

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        documentType: document.documentType,
        category: document.category,
        createdAt: document.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return apiErrors.internal(await t('api.uploadDocumentFailed'), error.message);
  }
}

// GET - List documents for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const clinicId = searchParams.get('clinicId');

    if (!leadId) {
      return apiErrors.badRequest(await t('api.leadIdRequired'));
    }

    const where: any = {
      leadId,
      userId: session.user.id,
      deletedAt: null,
    };
    if (clinicId) {
      where.clinicId = clinicId;
    }

    const documentType = searchParams.get('documentType');
    const category = searchParams.get('category');
    if (documentType) where.documentType = documentType;
    if (category) where.category = category;

    const db = getRouteDb(session);
    const documents = await db.patientDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        documentType: true,
        category: true,
        fileType: true,
        fileSize: true,
        description: true,
        tags: true,
        createdAt: true,
        createdBy: true,
        accessLevel: true,
        encryptedStoragePath: true,
      },
    });

    const documentsWithUrl = documents.map((doc: any) => {
      const isTestAsset = doc.encryptedStoragePath?.startsWith('/test-assets/');
      return {
        ...doc,
        fileUrl: isTestAsset ? doc.encryptedStoragePath : `/api/dental/documents/${doc.id}`,
        url: isTestAsset ? doc.encryptedStoragePath : `/api/dental/documents/${doc.id}`,
        encryptedStoragePath: undefined,
      };
    });

    return NextResponse.json({
      success: true,
      documents: documentsWithUrl,
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return apiErrors.internal(await t('api.fetchDocumentsFailed'));
  }
}
