/**
 * RAMQ Claims API
 * Handles RAMQ insurance claim creation and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/ramq/claims - List RAMQ claims
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const leadId = searchParams.get('leadId');

    // Verify user owns the requested userId
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // For now, store RAMQ claims in Lead.insuranceInfo JSON field
    // In production, you'd want a dedicated RAMQClaim model
    const where: any = { userId };
    if (leadId) {
      where.id = leadId;
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        contactPerson: true,
        businessName: true,
        insuranceInfo: true,
      },
    });

    // Extract RAMQ claims from insuranceInfo
    const claims: any[] = [];
    leads.forEach((lead) => {
      const insuranceInfo = lead.insuranceInfo as any;
      if (insuranceInfo?.ramqClaims && Array.isArray(insuranceInfo.ramqClaims)) {
        insuranceInfo.ramqClaims.forEach((claim: any) => {
          claims.push({
            ...claim,
            leadId: lead.id,
            patientName: lead.contactPerson || lead.businessName,
          });
        });
      }
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error('Error fetching RAMQ claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}

// POST /api/dental/ramq/claims - Create new RAMQ claim
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      leadId,
      patientName,
      patientRAMQNumber,
      procedureCode,
      procedureName,
      serviceDate,
      amount,
      notes,
    } = body;

    if (!userId || !patientName || !patientRAMQNumber || !procedureCode || !serviceDate || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user owns the userId
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create claim object
    const claim = {
      id: `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimNumber: null,
      patientName,
      patientRAMQNumber,
      procedureCode,
      procedureName,
      serviceDate: new Date(serviceDate).toISOString(),
      amount: parseFloat(amount),
      status: 'DRAFT' as const,
      submissionDate: null,
      responseDate: null,
      rejectionReason: null,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    // Store in Lead.insuranceInfo JSON field
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId, userId },
      });

      if (!lead) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }

      const insuranceInfo = (lead.insuranceInfo as any) || {};
      if (!insuranceInfo.ramqClaims) {
        insuranceInfo.ramqClaims = [];
      }
      insuranceInfo.ramqClaims.push(claim);
      insuranceInfo.ramqNumber = patientRAMQNumber;

      await prisma.lead.update({
        where: { id: leadId },
        data: { insuranceInfo },
      });
    } else {
      // If no leadId, create a new lead or store in user metadata
      // For now, we'll require a leadId
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error('Error creating RAMQ claim:', error);
    return NextResponse.json(
      { error: 'Failed to create claim' },
      { status: 500 }
    );
  }
}
