/**
 * Electronic Signature API
 * Handles signature creation and storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/signatures - Save electronic signature
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
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
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    // Verify user owns the userId
    if (userId !== session.user.id) {
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized(await t('api.unauthorized'));

    // Store signature in DentalFormResponse if documentId is a form response
    // Otherwise, store in document metadata or create a signature record
    // For now, we'll store in DentalFormResponse.signatureData if documentId matches
    
    if (documentId) {
      // Check if documentId is a form response ID
      const formResponse = await getCrmDb(ctx).dentalFormResponse.findUnique({
        where: { id: documentId },
      });

      if (formResponse) {
        // Update form response with signature
        // signatureData is a JSON field, so we need to structure it properly
        await getCrmDb(ctx).dentalFormResponse.update({
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
      const document = await getCrmDb(ctx).patientDocument.findUnique({
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

        await getCrmDb(ctx).patientDocument.update({
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
      const lead = await leadService.findUnique(ctx, leadId);

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

        await leadService.update(ctx, leadId, { dentalHistory });

        return NextResponse.json({
          success: true,
          message: 'Signature saved',
        });
      }
    }

    return apiErrors.notFound(await t('api.notFound'));
  } catch (error) {
    console.error('Error saving signature:', error);
    return apiErrors.internal(await t('api.saveSignatureFailed'));
  }
}
