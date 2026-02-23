/**
 * Consent Management API (Law 25 Requirement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConsentService } from '@/lib/storage/consent-service';
import { ConsentType } from '@prisma/client';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const consentService = new ConsentService();

// POST - Create consent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      leadId,
      consentType,
      purpose,
      legalBasis,
      consentMethod,
      grantedBy,
      consentExpiry,
    } = body;

    if (!leadId || !consentType || !purpose || !legalBasis || !consentMethod) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    const consent = await consentService.createConsent(
      leadId,
      session.user.id,
      consentType as ConsentType,
      purpose,
      legalBasis,
      consentMethod,
      grantedBy,
      consentExpiry ? new Date(consentExpiry) : undefined
    );

    return NextResponse.json({
      success: true,
      consent,
    });
  } catch (error: any) {
    console.error('Error creating consent:', error);
    return apiErrors.internal(await t('api.createConsentFailed'), error.message);
  }
}

// GET - Get consents for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return apiErrors.badRequest('Patient ID (leadId) is required');
    }

    const consents = await consentService.getActiveConsents(leadId, session.user.id);

    return NextResponse.json({
      success: true,
      consents,
    });
  } catch (error: any) {
    console.error('Error fetching consents:', error);
    return apiErrors.internal(await t('api.fetchConsentFailed'));
  }
}
