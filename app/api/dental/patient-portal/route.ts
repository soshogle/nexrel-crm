/**
 * Patient Portal API
 * Phase 5: Secure patient portal data access via token
 */

import { NextRequest, NextResponse } from 'next/server';
import { leadService, getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import crypto from 'crypto';
import { apiErrors } from '@/lib/api-error';

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
      return apiErrors.badRequest('Token required');
    }

    // TODO: Validate token from database and extract leadId/userId
    // For demo, fetch first lead to get userId - in production use proper token validation
    const db = getCrmDb(createDalContext('bootstrap'));
    const firstLead = await db.lead.findFirst({
      take: 1,
      select: { id: true, userId: true },
    });
    if (!firstLead) {
      return apiErrors.notFound('Patient not found');
    }
    const ctx = createDalContext(firstLead.userId);

    // Fetch patient data
    const lead = await leadService.findUnique(ctx, firstLead.id);

    if (!lead) {
      return apiErrors.notFound('Patient not found');
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

    // Fetch ortho treatments
    let orthoTreatments: any[] = [];
    try {
      orthoTreatments = await getCrmDb(ctx).orthoTreatment.findMany({
        where: { leadId: lead.id },
        orderBy: { startDate: 'desc' },
      });
    } catch {
      // Table may not exist in all environments
    }

    // Fetch payment plans
    let paymentPlans: any[] = [];
    try {
      paymentPlans = await getCrmDb(ctx).dentalPaymentPlan.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Table may not exist in all environments
    }

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
      orthoTreatments: orthoTreatments.map((t: any) => ({
        id: t.id,
        treatmentType: t.treatmentType,
        status: t.status,
        startDate: t.startDate,
        estimatedEndDate: t.estimatedEndDate,
        alignerBrand: t.alignerBrand,
        totalAligners: t.totalAligners,
        currentAligner: t.currentAligner,
        nextChangeDate: t.nextChangeDate,
        bracketSystem: t.bracketSystem,
        retainerType: t.retainerType,
        visits: t.visits,
      })),
      paymentPlans: paymentPlans.map((p: any) => ({
        id: p.id,
        planName: p.planName,
        totalAmount: p.totalAmount,
        paymentAmount: p.paymentAmount,
        numberOfPayments: p.numberOfPayments,
        status: p.status,
        installments: p.installments,
        nextPaymentDate: p.nextPaymentDate,
      })),
      bookingUserId: firstLead.userId,
    });
  } catch (error: any) {
    console.error('Error fetching patient portal data:', error);
    return apiErrors.internal('Failed to fetch portal data', error.message);
  }
}
