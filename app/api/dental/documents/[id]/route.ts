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
import { decryptData } from '@/lib/docpen/security';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.patientDocument.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if document is deleted
    if (document.deletedAt) {
      return NextResponse.json({ error: 'Document has been deleted' }, { status: 404 });
    }

    // Get encryption key (in production, retrieve from secure key management)
    // For now, we'll need to store the key securely - this is a placeholder
    const encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY || '';

    // Download and decrypt
    const fileBuffer = await storageService.downloadDocument(
      document.encryptedStoragePath,
      encryptionKey
    );

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
    return NextResponse.json(
      { error: 'Failed to download document', details: error.message },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.patientDocument.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permissions
    if (document.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if deletion is blocked (legal hold)
    if (document.deletionBlocked) {
      return NextResponse.json(
        { error: 'Document cannot be deleted due to legal hold' },
        { status: 403 }
      );
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
    return NextResponse.json(
      { error: 'Failed to delete document', details: error.message },
      { status: 500 }
    );
  }
}
