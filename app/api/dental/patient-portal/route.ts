/**
 * Patient Portal API
 * Phase 5: Secure patient portal data access via token
 */

import { NextRequest, NextResponse } from 'next/server';
import { leadService, getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Generate portal token (in production, store securely)
function generatePortalToken(leadId: string, userId: string): string {
  const payload = `${leadId}:${userId}:${Date.now()}`;
  const token = crypto.createHash('sha256').update(payload).digest('hex');
  return token;
}

// GET - Get portal data by token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // TODO: Validate token from database and extract leadId/userId
    // For demo, fetch first lead to get userId - in production use proper token validation
    const db = getCrmDb(createDalContext('bootstrap'));
    const firstLead = await db.lead.findFirst({
      take: 1,
      select: { id: true, userId: true },
    });
    if (!firstLead) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    const ctx = createDalContext(firstLead.userId);

    // Fetch patient data
    const lead = await leadService.findUnique(ctx, firstLead.id);

    if (!lead) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch treatment plans
    const treatmentPlans = await getCrmDb(ctx).dentalTreatmentPlan.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch appointments
    const appointments = await getCrmDb(ctx).bookingAppointment.findMany({
      where: { leadId: lead.id },
      orderBy: { appointmentDate: 'desc' },
      take: 10,
      select: {
        id: true,
        appointmentDate: true,
        duration: true,
        status: true,
        notes: true,
        customerName: true,
      },
    });

    // Fetch documents
    const documents = await getCrmDb(ctx).patientDocument.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fileName: true,
        category: true,
        createdAt: true,
        encryptedStoragePath: true,
      },
    });

    // Fetch invoices
    const invoices = await getCrmDb(ctx).invoice.findMany({
      where: { leadId: lead.id },
      orderBy: { issueDate: 'desc' },
      take: 10,
    });

    // Fetch X-rays
    const xrays = await getCrmDb(ctx).dentalXRay.findMany({
      where: { leadId: lead.id },
      orderBy: { dateTaken: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      patient: {
        name: lead.businessName || lead.contactPerson || 'Patient',
        email: lead.email || '',
        phone: lead.phone || '',
      },
      treatmentPlans: treatmentPlans.map((plan) => ({
        id: plan.id,
        leadId: plan.leadId,
        planName: plan.planName,
        description: plan.description,
        status: plan.status,
        totalCost: plan.totalCost,
        patientResponsibility: plan.patientResponsibility,
        createdDate: plan.createdDate,
      })),
      appointments: appointments.map((appt) => ({
        id: appt.id,
        startTime: appt.appointmentDate,
        professionalName: appt.customerName || 'Unknown',
        status: appt.status,
        notes: appt.notes || null,
      })),
      documents: documents.map((doc) => ({
        id: doc.id,
        name: doc.fileName || doc.category || 'Document',
        url: doc.encryptedStoragePath || '', // In production, generate signed URL
        createdAt: doc.createdAt,
      })),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
      })),
      xrays: xrays.map((xray) => ({
        id: xray.id,
        description: xray.xrayType || null,
        imageUrl: xray.fullUrl || xray.imageUrl || '',
        thumbnailUrl: xray.thumbnailUrl || null,
        takenDate: xray.dateTaken,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching patient portal data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal data', details: error.message },
      { status: 500 }
    );
  }
}
