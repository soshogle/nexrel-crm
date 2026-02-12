/**
 * Docpen workflow audit logging
 */

import { prisma } from '@/lib/db';

export const DOCPEN_AUDIT_EVENTS = {
  SESSION_CREATED: 'session_created',
  RECORDING_STARTED: 'recording_started',
  SOAP_GENERATED: 'soap_generated',
  REVIEWED: 'reviewed',
  SIGNED: 'signed',
  EXPORTED: 'exported',
} as const;

export async function logDocpenAudit(
  sessionId: string,
  event: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.docpenSessionAuditLog.create({
      data: { sessionId, event, metadata: metadata ?? undefined },
    });
  } catch (err) {
    console.warn('[Docpen Audit] Failed to log:', event, err);
  }
}
