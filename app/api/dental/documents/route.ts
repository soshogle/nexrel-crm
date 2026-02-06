/**
 * Dental Document Management API (Law 25 Compliant)
 * Handles document upload, download, and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { ConsentService } from '@/lib/storage/consent-service';
import { AccessAuditService } from '@/lib/storage/access-audit-service';
import { generateEncryptionKey } from '@/lib/docpen/security';
import { DocumentType, DocumentAccessLevel, ConsentType } from '@prisma/client';
import { t } from '@/lib/i18n-server';

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
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const leadId = formData.get('leadId') as string | null;
    const documentType = formData.get('documentType') as DocumentType | null;
    const category = formData.get('category') as string | null;
    const description = formData.get('description') as string | null;
    const tags = formData.get('tags') as string | null;
    const consentId = formData.get('consentId') as string | null;
    const accessLevel = (formData.get('accessLevel') as DocumentAccessLevel) || 'RESTRICTED';

    if (!file) {
      return NextResponse.json({ error: await t('api.missingRequiredFields') }, { status: 400 });
    }

    if (!leadId) {
      return NextResponse.json({ error: await t('api.leadIdRequired') }, { status: 400 });
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
        return NextResponse.json(
          { error: await t('api.missingRequiredFields') },
          { status: 403 }
        );
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
    const document = await prisma.patientDocument.create({
      data: {
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
      },
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
    return NextResponse.json(
      { error: await t('api.uploadDocumentFailed'), details: error.message },
      { status: 500 }
    );
  }
}

// GET - List documents for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: await t('api.leadIdRequired') }, { status: 400 });
    }

    const documents = await prisma.patientDocument.findMany({
      where: {
        leadId,
        userId: session.user.id,
        deletedAt: null,
      },
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
      },
    });

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: await t('api.fetchDocumentsFailed') },
      { status: 500 }
    );
  }
}
