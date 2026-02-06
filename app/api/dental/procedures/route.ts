/**
 * Dental Procedure API
 * Handles procedure log/activity log CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ProcedureStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get procedures for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const treatmentPlanId = searchParams.get('treatmentPlanId');
    const status = searchParams.get('status') as ProcedureStatus | null;

    const where: any = {
      userId: session.user.id,
    };

    if (leadId) {
      where.leadId = leadId;
    }

    if (treatmentPlanId) {
      where.treatmentPlanId = treatmentPlanId;
    }

    if (status) {
      where.status = status;
    }

    const procedures = await prisma.dentalProcedure.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
      include: {
        treatmentPlan: {
          select: {
            planName: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      procedures,
    });
  } catch (error: any) {
    console.error('Error fetching procedures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch procedures' },
      { status: 500 }
    );
  }
}

// POST - Create new procedure
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      leadId,
      treatmentPlanId,
      procedureCode,
      procedureName,
      description,
      teethInvolved,
      cost,
      insuranceCoverage,
      scheduledDate,
      performedDate,
      performedBy,
      notes,
      status,
    } = body;

    if (!leadId || !procedureCode || !procedureName) {
      return NextResponse.json(
        { error: 'Patient ID, procedure code, and procedure name are required' },
        { status: 400 }
      );
    }

    const procedure = await prisma.dentalProcedure.create({
      data: {
        leadId,
        userId: session.user.id,
        treatmentPlanId: treatmentPlanId || null,
        procedureCode,
        procedureName,
        description: description || null,
        teethInvolved: teethInvolved || [],
        cost: cost || 0,
        insuranceCoverage: insuranceCoverage || 0,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        performedDate: performedDate ? new Date(performedDate) : null,
        performedBy: performedBy || null,
        notes: notes || null,
        status: status || ProcedureStatus.SCHEDULED,
      },
    });

    return NextResponse.json({
      success: true,
      procedure,
    });
  } catch (error: any) {
    console.error('Error creating procedure:', error);
    return NextResponse.json(
      { error: 'Failed to create procedure', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update procedure status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, performedDate, performedBy, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Procedure ID and status are required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
    };

    if (status === ProcedureStatus.COMPLETED && performedDate) {
      updateData.performedDate = new Date(performedDate);
    }

    if (performedBy) {
      updateData.performedBy = performedBy;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const procedure = await prisma.dentalProcedure.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      procedure,
    });
  } catch (error: any) {
    console.error('Error updating procedure:', error);
    return NextResponse.json(
      { error: 'Failed to update procedure', details: error.message },
      { status: 500 }
    );
  }
}
