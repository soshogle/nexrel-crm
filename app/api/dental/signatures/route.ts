/**
 * Electronic Signature API
 * Handles signature creation and storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { t } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/signatures - Save electronic signature
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      leadId,
      documentId,
      signatureData,
      signerName,
      signerTitle,
      signatureDate,
      notes,
    } = body;

    if (!userId || !signatureData || !signerName || !signatureDate) {
      return NextResponse.json(
        { error: await t('api.missingRequiredFields') },
        { status: 400 }
      );
    }

    // Verify user owns the userId
    if (userId !== session.user.id) {
      return NextResponse.json({ error: await t('api.forbidden') }, { status: 403 });
    }

    // Store signature in DentalFormResponse if documentId is a form response
    // Otherwise, store in document metadata or create a signature record
    // For now, we'll store in DentalFormResponse.signatureData if documentId matches
    
    if (documentId) {
      // Check if documentId is a form response ID
      const formResponse = await prisma.dentalFormResponse.findUnique({
        where: { id: documentId },
      });

      if (formResponse) {
        // Update form response with signature
        // signatureData is a JSON field, so we need to structure it properly
        await prisma.dentalFormResponse.update({
          where: { id: documentId },
          data: {
            signatureData: {
              signature: signatureData,
              signedBy: signerName,
              signedAt: new Date(signatureDate).toISOString(),
              signerTitle: signerTitle || null,
              notes: notes || null,
            },
          },
        });

        return NextResponse.json({
          success: true,
          signatureId: documentId,
          message: 'Signature saved to form response',
        });
      }

      // If not a form response, store in document metadata
      const document = await prisma.patientDocument.findUnique({
        where: { id: documentId },
      });

      if (document) {
        const metadata = (document.metadata as any) || {};
        if (!metadata.signatures) {
          metadata.signatures = [];
        }
        metadata.signatures.push({
          signatureData,
          signerName,
          signerTitle: signerTitle || null,
          signatureDate: new Date(signatureDate).toISOString(),
          notes: notes || null,
          createdAt: new Date().toISOString(),
        });

        await prisma.patientDocument.update({
          where: { id: documentId },
          data: { metadata },
        });

        return NextResponse.json({
          success: true,
          signatureId: documentId,
          message: 'Signature saved to document',
        });
      }
    }

    // If no documentId, create a standalone signature record
    // Store in Lead's dentalHistory or create a new signature entry
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId, userId },
      });

      if (lead) {
        const dentalHistory = (lead.dentalHistory as any) || {};
        if (!dentalHistory.signatures) {
          dentalHistory.signatures = [];
        }
        dentalHistory.signatures.push({
          id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          signatureData,
          signerName,
          signerTitle: signerTitle || null,
          signatureDate: new Date(signatureDate).toISOString(),
          notes: notes || null,
          createdAt: new Date().toISOString(),
        });

        await prisma.lead.update({
          where: { id: leadId },
          data: { dentalHistory },
        });

        return NextResponse.json({
          success: true,
          message: 'Signature saved',
        });
      }
    }

    return NextResponse.json(
      { error: await t('api.notFound') },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error saving signature:', error);
    return NextResponse.json(
      { error: await t('api.saveSignatureFailed') },
      { status: 500 }
    );
  }
}
