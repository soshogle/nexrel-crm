/**
 * TanStack Query keys and fetchers for HITL (Human-in-the-Loop) data.
 * Shared across HITL banner, notification bell, and approval panel.
 */

import { parseHITLApprovals, parseHITLNotifications } from './api-validation';

export const hitlQueryKeys = {
  all: ['hitl'] as const,
  pending: () => [...hitlQueryKeys.all, 'pending'] as const,
};

export interface HITLPendingResponse {
  success: boolean;
  notifications: unknown[];
  pendingApprovals: unknown[];
  totalPending?: number;
}

async function fetchHITLPending(): Promise<HITLPendingResponse> {
  const res = await fetch('/api/real-estate/workflows/hitl/pending');
  if (!res.ok) {
    throw new Error('Failed to fetch HITL pending');
  }
  return res.json();
}

/** Parsed pending approvals for banner (from pendingApprovals) */
export interface BannerNotification {
  id: string;
  executionId: string;
  taskName: string;
  contactName?: string;
  dealAddress?: string;
  message: string;
  urgency: string;
  createdAt: string;
}

export function parseBannerNotifications(data: HITLPendingResponse): BannerNotification[] {
  const approvals = parseHITLApprovals(data.pendingApprovals ?? []);
  return approvals.slice(0, 1).map((approval) => ({
    id: approval.id ?? '',
    executionId: approval.id ?? '',
    taskName: approval.task?.name || 'Unknown Task',
    contactName: approval.instance?.lead?.businessName || approval.instance?.lead?.contactPerson,
    dealAddress: approval.instance?.deal?.title,
    message: approval.task?.description || 'Requires your approval',
    urgency: 'HIGH' as const,
    createdAt: approval.createdAt ?? '',
  }));
}

/** Parsed notifications for bell/panel (from notifications) */
export function parsePanelNotifications(data: HITLPendingResponse) {
  return parseHITLNotifications(data.notifications ?? []);
}

/** Fetcher for React Query - returns raw data, components parse as needed */
export async function fetchHITLPendingData(): Promise<HITLPendingResponse> {
  return fetchHITLPending();
}
