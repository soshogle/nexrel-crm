/**
 * Lightweight CRM Event Emitter
 * Tracks recent CRM actions in-memory for AI Brain consumption.
 * No database migration required — events are ephemeral (last 1 hour).
 */

export type CRMEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_converted"
  | "lead_lost"
  | "deal_created"
  | "deal_stage_changed"
  | "deal_won"
  | "deal_lost"
  | "task_created"
  | "task_completed"
  | "task_overdue"
  | "campaign_sent"
  | "campaign_completed"
  | "email_opened"
  | "email_clicked"
  | "sms_replied"
  | "call_completed"
  | "call_missed"
  | "workflow_started"
  | "workflow_completed"
  | "appointment_booked"
  | "appointment_cancelled"
  | "payment_received"
  | "invoice_sent"
  | "website_lead_captured";

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

  emit(
    type: CRMEventType,
    userId: string,
    details?: {
      entityId?: string;
      entityType?: string;
      data?: Record<string, any>;
    },
  ) {
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
    this.persistEvent(event).catch(() => undefined);

    // Notify listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      for (const fn of typeListeners) {
        try {
          fn(event);
        } catch {
          /* listener error shouldn't break emitter */
        }
      }
    }
    const allListeners = this.listeners.get("*");
    if (allListeners) {
      for (const fn of allListeners) {
        try {
          fn(event);
        } catch {}
      }
    }
  }

  on(type: CRMEventType | "*", callback: (event: CRMEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  getRecentEvents(
    userId: string,
    options?: { type?: CRMEventType; limit?: number; sinceMinutes?: number },
  ): CRMEvent[] {
    const since = options?.sinceMinutes
      ? new Date(Date.now() - options.sinceMinutes * 60 * 1000)
      : new Date(Date.now() - TTL_MS);

    let filtered = this.events.filter(
      (e) => e.userId === userId && e.timestamp >= since,
    );
    if (options?.type)
      filtered = filtered.filter((e) => e.type === options.type);
    const limit = options?.limit || 50;
    return filtered.slice(-limit);
  }

  getEventSummary(
    userId: string,
    sinceMinutes = 60,
  ): Record<CRMEventType, number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const userEvents = this.events.filter(
      (e) => e.userId === userId && e.timestamp >= since,
    );
    const summary: Partial<Record<CRMEventType, number>> = {};
    for (const e of userEvents) {
      summary[e.type] = (summary[e.type] || 0) + 1;
    }
    return summary as Record<CRMEventType, number>;
  }

  async getDurableEventSummary(
    userId: string,
    sinceMinutes = 60,
  ): Promise<Record<CRMEventType, number>> {
    const inMemory = this.getEventSummary(userId, sinceMinutes);
    try {
      const ctx = await resolveDalContext(userId);
      const db = getCrmDb(ctx);
      const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
      const logs = await db.auditLog.findMany({
        where: {
          userId,
          entityType: "CRM_EVENT",
          createdAt: { gte: since },
        },
        select: { metadata: true },
        take: 2000,
        orderBy: { createdAt: "desc" },
      });

      const durable: Partial<Record<CRMEventType, number>> = {};
      for (const log of logs) {
        const type = String((log.metadata as any)?.type || "") as CRMEventType;
        if (!type) continue;
        durable[type] = (durable[type] || 0) + 1;
      }

      const merged: Partial<Record<CRMEventType, number>> = { ...durable };
      for (const [key, value] of Object.entries(inMemory)) {
        const k = key as CRMEventType;
        merged[k] = Math.max(Number(merged[k] || 0), Number(value || 0));
      }

      return merged as Record<CRMEventType, number>;
    } catch {
      return inMemory;
    }
  }

  private async persistEvent(event: CRMEvent): Promise<void> {
    try {
      const ctx = await resolveDalContext(event.userId);
      const db = getCrmDb(ctx);
      await db.auditLog.create({
        data: {
          userId: event.userId,
          action: "SETTINGS_MODIFIED",
          severity: "LOW",
          entityType: "CRM_EVENT",
          entityId: event.id,
          metadata: {
            type: event.type,
            entityId: event.entityId || null,
            entityType: event.entityType || null,
            data: event.data || {},
            timestamp: event.timestamp.toISOString(),
          },
          success: true,
        },
      });
    } catch {
      // never block caller on event persistence
    }
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
  details?: {
    entityId?: string;
    entityType?: string;
    data?: Record<string, any>;
  },
) {
  crmEvents.emit(type, userId, details);
}
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
