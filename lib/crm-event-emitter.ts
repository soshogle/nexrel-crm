/**
 * Lightweight CRM Event Emitter
 * Tracks recent CRM actions in-memory for AI Brain consumption.
 * No database migration required — events are ephemeral (last 1 hour).
 */

export type CRMEventType =
  | 'lead_created' | 'lead_updated' | 'lead_converted' | 'lead_lost'
  | 'deal_created' | 'deal_stage_changed' | 'deal_won' | 'deal_lost'
  | 'task_created' | 'task_completed' | 'task_overdue'
  | 'campaign_sent' | 'campaign_completed'
  | 'email_opened' | 'email_clicked' | 'sms_replied'
  | 'call_completed' | 'call_missed'
  | 'workflow_started' | 'workflow_completed'
  | 'appointment_booked' | 'appointment_cancelled'
  | 'payment_received' | 'invoice_sent'
  | 'website_lead_captured';

export interface CRMEvent {
  id: string;
  type: CRMEventType;
  userId: string;
  entityId?: string;
  entityType?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

const MAX_EVENTS = 500;
const TTL_MS = 60 * 60 * 1000; // 1 hour

class CRMEventEmitter {
  private events: CRMEvent[] = [];
  private listeners = new Map<string, Set<(event: CRMEvent) => void>>();

  emit(type: CRMEventType, userId: string, details?: { entityId?: string; entityType?: string; data?: Record<string, any> }) {
    const event: CRMEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      userId,
      entityId: details?.entityId,
      entityType: details?.entityType,
      data: details?.data,
      timestamp: new Date(),
    };
    this.events.push(event);
    this.cleanup();

    // Notify listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      for (const fn of typeListeners) {
        try { fn(event); } catch { /* listener error shouldn't break emitter */ }
      }
    }
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      for (const fn of allListeners) {
        try { fn(event); } catch {}
      }
    }
  }

  on(type: CRMEventType | '*', callback: (event: CRMEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(callback);
    return () => { this.listeners.get(type)?.delete(callback); };
  }

  getRecentEvents(userId: string, options?: { type?: CRMEventType; limit?: number; sinceMinutes?: number }): CRMEvent[] {
    const since = options?.sinceMinutes
      ? new Date(Date.now() - options.sinceMinutes * 60 * 1000)
      : new Date(Date.now() - TTL_MS);

    let filtered = this.events.filter((e) => e.userId === userId && e.timestamp >= since);
    if (options?.type) filtered = filtered.filter((e) => e.type === options.type);
    const limit = options?.limit || 50;
    return filtered.slice(-limit);
  }

  getEventSummary(userId: string, sinceMinutes = 60): Record<CRMEventType, number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const userEvents = this.events.filter((e) => e.userId === userId && e.timestamp >= since);
    const summary: Partial<Record<CRMEventType, number>> = {};
    for (const e of userEvents) {
      summary[e.type] = (summary[e.type] || 0) + 1;
    }
    return summary as Record<CRMEventType, number>;
  }

  private cleanup() {
    const cutoff = new Date(Date.now() - TTL_MS);
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
  }
}

export const crmEvents = new CRMEventEmitter();

/**
 * Convenience helper — call from any API route to log a CRM action.
 * Example: emitCRMEvent('lead_created', userId, { entityId: lead.id, entityType: 'Lead' });
 */
export function emitCRMEvent(
  type: CRMEventType,
  userId: string,
  details?: { entityId?: string; entityType?: string; data?: Record<string, any> }
) {
  crmEvents.emit(type, userId, details);
}
