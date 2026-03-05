/**
 * Odontogram import utilities - shared by import API, X-ray AI, and voice
 */

import { prisma } from '@/lib/db';

export type ToothCondition = 'healthy' | 'caries' | 'crown' | 'filling' | 'missing' | 'extraction' | 'implant' | 'root_canal';

export interface ToothInfo {
  condition?: ToothCondition;
  treatment?: string;
  completed?: boolean;
  date?: string;
  notes?: string;
}

export type ToothData = Record<string, ToothInfo>;

export function validateToothData(m: unknown): m is ToothData {
  if (!m || typeof m !== 'object') return false;
  for (const [tooth, data] of Object.entries(m)) {
    const toothNum = parseInt(tooth, 10);
    if (isNaN(toothNum) || toothNum < 1 || toothNum > 32) return false;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (d.condition && typeof d.condition !== 'string') return false;
      if (d.treatment && typeof d.treatment !== 'string') return false;
      if (d.completed !== undefined && typeof d.completed !== 'boolean') return false;
    }
  }
  return true;
}

export async function findLeadForImport(userId: string, body: {
  leadId?: string;
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
}) {
  const { leadId, patientId, patientName, patientEmail } = body;

  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (lead) return lead;
  }
  if (patientId) {
    const lead = await prisma.lead.findFirst({ where: { id: patientId, userId } });
    if (lead) return lead;
  }
  if (patientName?.trim()) {
    const name = patientName.trim();
    const lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { equals: name, mode: 'insensitive' } },
          { businessName: { equals: name, mode: 'insensitive' } },
          { contactPerson: { contains: name, mode: 'insensitive' } },
          { businessName: { contains: name, mode: 'insensitive' } },
        ],
      },
    });
    if (lead) return lead;
  }
  if (patientEmail?.trim()) {
    const lead = await prisma.lead.findFirst({
      where: { userId, email: { equals: patientEmail.trim(), mode: 'insensitive' } },
    });
    if (lead) return lead;
  }
  return null;
}

export async function upsertOdontogram(params: {
  leadId: string;
  userId: string;
  toothData: ToothData;
  notes?: string | null;
  clinicId?: string | null;
  chartedBy?: string;
}) {
  const { leadId, userId, toothData, notes, clinicId, chartedBy } = params;

  const where: any = { leadId, userId };
  if (clinicId) where.clinicId = clinicId;

  const existing = await prisma.dentalOdontogram.findFirst({
    where,
    orderBy: { chartDate: 'desc' },
  });

  const baseData = {
    toothData: toothData as any,
    notes: notes || null,
    chartedBy: chartedBy || userId,
    updatedAt: new Date(),
  };

  if (existing) {
    return prisma.dentalOdontogram.update({
      where: { id: existing.id },
      data: baseData,
    });
  }

  // Resolve clinicId when creating - required by schema
  let resolvedClinicId = clinicId;
  if (!resolvedClinicId) {
    const membership = await prisma.userClinic.findFirst({
      where: { userId, isPrimary: true },
      select: { clinicId: true },
    });
    resolvedClinicId = membership?.clinicId ?? undefined;
  }
  if (!resolvedClinicId) {
    const anyMembership = await prisma.userClinic.findFirst({
      where: { userId },
      select: { clinicId: true },
    });
    resolvedClinicId = anyMembership?.clinicId ?? undefined;
  }
  if (!resolvedClinicId) {
    const fallback = await prisma.clinic.findFirst({ select: { id: true } });
    resolvedClinicId = fallback?.id;
  }
  if (!resolvedClinicId) {
    throw new Error('clinicId is required for odontogram creation and could not be resolved from user membership or default clinic');
  }

  return prisma.dentalOdontogram.create({
    data: {
      leadId,
      userId,
      toothData: toothData as any,
      notes: notes || null,
      chartedBy: chartedBy || userId,
      clinicId: resolvedClinicId,
    },
  });
}
