/**
 * Consent Management API (Law 25 Requirement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConsentService } from '@/lib/storage/consent-service';
import { ConsentType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const consentService = new ConsentService();

// POST - Create consent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to create consent', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get consents for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'Patient ID (leadId) is required' }, { status: 400 });
    }

    const consents = await consentService.getActiveConsents(leadId, session.user.id);

    return NextResponse.json({
      success: true,
      consents,
    });
  } catch (error: any) {
    console.error('Error fetching consents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consents' },
      { status: 500 }
    );
  }
}
