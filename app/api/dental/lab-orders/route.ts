/**
 * Lab Orders API
 * Phase 6: Lab order management and tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `LAB-${year}${month}${day}-${random}`;
}

// GET - List lab orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const treatmentPlanId = searchParams.get('treatmentPlanId');

    // Get user's clinics for filtering
    const userClinics = await prisma.userClinic.findMany({
      where: { userId: session.user.id },
      select: { clinicId: true },
    });
    const clinicIds = userClinics.map(uc => uc.clinicId);

    const where: any = {
      userId: session.user.id,
      clinicId: { in: clinicIds },
    };

    if (leadId) {
      where.leadId = leadId;
    }

    if (status) {
      where.status = status;
    }

    if (treatmentPlanId) {
      where.treatmentPlanId = treatmentPlanId;
    }

    const orders = await prisma.dentalLabOrder.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Error fetching lab orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab orders', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create or update lab order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      leadId,
      treatmentPlanId,
      procedureId,
      labName,
      labContact,
      orderType,
      description,
      instructions,
      patientInfo,
      impressionDate,
      deliveryDate,
      cost,
      trackingNumber,
      shippingMethod,
      attachments,
      prescriptionUrl,
      notes,
      internalNotes,
      status,
      submitNow,
    } = body;

    if (!leadId || !labName || !orderType) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, labName, orderType' },
        { status: 400 }
      );
    }

    const orderNumber = id
      ? undefined // Keep existing order number
      : generateOrderNumber();

    // Get user's primary clinic for clinicId
    const userClinic = await prisma.userClinic.findFirst({
      where: {
        userId: session.user.id,
        isPrimary: true,
      },
      include: {
        clinic: true,
      },
    });

    if (!userClinic) {
      return NextResponse.json(
        { error: 'No clinic found. Please create a clinic first.' },
        { status: 400 }
      );
    }

    const data: any = {
      leadId,
      userId: session.user.id,
      clinicId: userClinic.clinicId,
      labName,
      orderType,
      description: description || null,
      instructions: instructions || null,
      patientInfo: patientInfo || {},
      impressionDate: impressionDate ? new Date(impressionDate) : null,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      cost: cost || null,
      trackingNumber: trackingNumber || null,
      shippingMethod: shippingMethod || null,
      attachments: attachments || null,
      prescriptionUrl: prescriptionUrl || null,
      notes: notes || null,
      internalNotes: internalNotes || null,
      status: submitNow ? 'SUBMITTED' : status || 'PENDING',
    };

    if (orderNumber) {
      data.orderNumber = orderNumber;
    }

    if (labContact) {
      data.labContact = labContact;
    }

    if (treatmentPlanId) {
      data.treatmentPlanId = treatmentPlanId;
    }

    if (procedureId) {
      data.procedureId = procedureId;
    }

    if (submitNow) {
      data.submittedAt = new Date();
    }

    let order;
    if (id) {
      // Update existing order
      order = await prisma.dentalLabOrder.update({
        where: { id },
        data,
      });
    } else {
      // Create new order
      order = await prisma.dentalLabOrder.create({
        data,
      });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('Error creating/updating lab order:', error);
    return NextResponse.json(
      { error: 'Failed to create/update lab order', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update lab order status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, trackingNumber, shippingMethod } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
    };

    // Update status-specific timestamps
    switch (status) {
      case 'SUBMITTED':
        updateData.submittedAt = new Date();
        break;
      case 'RECEIVED':
        updateData.receivedAt = new Date();
        break;
      case 'IN_PROGRESS':
        updateData.inProgressAt = new Date();
        break;
      case 'COMPLETED':
        updateData.completedAt = new Date();
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
    }

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (shippingMethod) {
      updateData.shippingMethod = shippingMethod;
    }

    const order = await prisma.dentalLabOrder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('Error updating lab order status:', error);
    return NextResponse.json(
      { error: 'Failed to update lab order status', details: error.message },
      { status: 500 }
    );
  }
}
