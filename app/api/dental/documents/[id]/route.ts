/**
 * Individual Document API (Law 25 Compliant)
 * Handles document download, delete, and metadata updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { AccessAuditService } from '@/lib/storage/access-audit-service';
import { t } from '@/lib/i18n-server';
import * as fs from 'fs';
import * as path from 'path';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const storageService = new CanadianStorageService();
const auditService = new AccessAuditService();

// GET - Download document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const document = await prisma.patientDocument.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return apiErrors.notFound(await t('api.notFound'));
    }

    // Check access permissions
    if (document.userId !== session.user.id) {
      await auditService.logFailedAccess(
        document.id,
        session.user.id,
        'DOWNLOAD',
        'Document download',
        'Unauthorized access attempt',
        request
      );
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    // Check if document is deleted
    if (document.deletedAt) {
      return apiErrors.notFound(await t('api.notFound'));
    }

    let fileBuffer: Buffer;

    // Test-assets: serve from local public folder (no S3)
    if (document.encryptedStoragePath?.startsWith('/test-assets/')) {
      const publicPath = path.join(process.cwd(), 'public', document.encryptedStoragePath);
      if (!fs.existsSync(publicPath)) {
        return apiErrors.notFound(await t('api.notFound'));
      }
      fileBuffer = fs.readFileSync(publicPath);
    } else {
      const encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY || '';
      fileBuffer = await storageService.downloadDocument(
        document.encryptedStoragePath,
        encryptionKey
      );
    }

    // Log access
    await auditService.logAccess(
      document.id,
      session.user.id,
      'DOWNLOAD',
      'Document download',
      request
    );

    // Update last accessed
    await prisma.patientDocument.update({
      where: { id: document.id },
      data: {
        lastAccessedBy: session.user.id,
        lastAccessedAt: new Date(),
      },
    });

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error downloading document:', error);
    return apiErrors.internal(await t('api.downloadDocumentFailed'), error.message);
  }
}

// DELETE - Delete document (soft delete, respects retention)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const document = await prisma.patientDocument.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return apiErrors.notFound(await t('api.notFound'));
    }

    // Check permissions
    if (document.userId !== session.user.id) {
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    // Check if deletion is blocked (legal hold)
    if (document.deletionBlocked) {
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    // Check retention policy
    if (document.retentionExpiry > new Date()) {
      // Mark for deletion but don't delete yet
      await prisma.patientDocument.update({
        where: { id: document.id },
        data: {
          deletionRequested: true,
          deletionRequestDate: new Date(),
          deletionReason: 'Manual deletion request',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Document marked for deletion after retention period expires',
        retentionExpiry: document.retentionExpiry,
      });
    }

    // Retention expired - can delete
    await storageService.deleteDocument(document.encryptedStoragePath);

    await prisma.patientDocument.update({
      where: { id: document.id },
      data: { deletedAt: new Date() },
    });

    // Log deletion
    await auditService.logAccess(
      document.id,
      session.user.id,
      'DELETE',
      'Document deletion',
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return apiErrors.internal(await t('api.deleteDocumentFailed'), error.message);
  }
}
