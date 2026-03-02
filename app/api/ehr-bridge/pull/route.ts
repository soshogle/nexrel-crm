/**
 * POST /api/ehr-bridge/pull
 * Receive DOM-extracted patient/calendar data from extension
 * Syncs to Lead (create or update by email/phone match)
 * Requires: Authorization: Bearer <extension_token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCrmDb, leadService } from '@/lib/dal';
import { resolveDalContext } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyToken(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !token.startsWith('ehr_')) return null;

  const apiKeys = await prisma.apiKey.findMany({
    where: { service: 'ehr_bridge', keyName: 'extension_token', isActive: true },
  });
  for (const key of apiKeys) {
    try {
      const parsed = JSON.parse(key.keyValue) as { token: string; expiresAt: string };
      if (parsed.token === token && new Date(parsed.expiresAt) >= new Date()) {
        return { userId: key.userId };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyToken(request);
    if (!auth) {
      return apiErrors.unauthorized('Invalid or expired token');
    }

    const body = await request.json().catch(() => ({}));
    const { source = 'dom', ehrType, pageType, dataType, data, url } = body;

    if (!data || typeof data !== 'object') {
      return apiErrors.badRequest('Missing or invalid data');
    }

    let result: { created?: boolean; leadId?: string; matched?: string; error?: string } = {};

    if (dataType === 'patient' || (data.patientName || data.email || data.phone)) {
      const email = normalizeEmail(data.email);
      const phone = normalizePhone(data.phone);
      const patientName = (data.patientName || '').trim() || undefined;

      if (!email && !phone && !patientName) {
        return apiErrors.badRequest('Need at least email, phone, or patient name to sync');
      }

      let existing: { id: string; businessName: string } | null = null;

      const ctx = await resolveDalContext(auth.userId);
      const db = getCrmDb(ctx);

      if (email) {
        existing = ((await leadService.findMany(ctx, { where: { email }, take: 1 } as any))[0] as any) || null;
      }
      if (!existing && phone) {
        const leads: any[] = await leadService.findMany(ctx, { select: { id: true, businessName: true, phone: true } } as any);
        const phoneDigits = normalizePhone(phone);
        existing = leads.find((l: any) => l.phone && normalizePhone(l.phone) === phoneDigits) || null;
      }
      if (!existing && patientName) {
        existing = ((await leadService.findMany(ctx, { where: { contactPerson: { equals: patientName, mode: 'insensitive' } }, take: 1 } as any))[0] as any) || null;
      }

      const updateData: Record<string, unknown> = {};
      if (patientName) updateData.contactPerson = patientName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (data.address) updateData.address = data.address;
      if (data.dob) updateData.dateOfBirth = parseDob(data.dob);

      if (existing) {
        if (data.priorNotes || data.lastVisitDate) {
          const current = await leadService.findUnique(ctx, existing.id);
          const existingDh = (current?.dentalHistory as Record<string, unknown>) || {};
          updateData.dentalHistory = {
            ...existingDh,
            ...(data.priorNotes && { priorNotes: data.priorNotes }),
            ...(data.lastVisitDate && { lastVisitDate: data.lastVisitDate }),
          };
        }
        await leadService.update(ctx, existing.id, updateData as any);
        result = { created: false, leadId: existing.id, matched: email ? 'email' : 'phone' };
      } else {
        const dentalHistory =
          data.priorNotes || data.lastVisitDate
            ? { priorNotes: data.priorNotes, lastVisitDate: data.lastVisitDate }
            : undefined;
        const lead = await leadService.create(ctx, {
          businessName: patientName || 'Unknown',
          contactPerson: patientName,
          email: email || null,
          phone: phone || null,
          address: (data.address as string) || null,
          dateOfBirth: parseDob(data.dob),
          dentalHistory: dentalHistory as any,
          source: 'ehr_bridge',
        } as any);
        result = { created: true, leadId: lead.id };
      }
    } else if (dataType === 'calendar' && Array.isArray(data.appointments)) {
      result = {
        matched: 'calendar',
        appointmentsCount: data.appointments.length,
        message: `Extracted ${data.appointments.length} appointments from calendar payload`,
      } as any;
    } else {
      return apiErrors.badRequest('Unsupported data type');
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[EHR Bridge] Pull failed:', error);
    return apiErrors.internal('Failed to sync data');
  }
}

function parseDob(dob: string | null | undefined): Date | null {
  if (!dob || typeof dob !== 'string') return null;
  const d = new Date(dob);
  return isNaN(d.getTime()) ? null : d;
}
