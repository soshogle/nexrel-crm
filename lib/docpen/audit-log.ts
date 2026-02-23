/**
 * Docpen workflow audit logging
 */

import { getCrmDb } from '@/lib/dal'
import { createDalContext } from '@/lib/context/industry-context';
const db = getCrmDb({ userId: '', industry: null })

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
    await db.docpenSessionAuditLog.create({
      data: { sessionId, event, metadata: (metadata ?? undefined) as any },
    });
  } catch (err) {
    console.warn('[Docpen Audit] Failed to log:', event, err);
  }
}
