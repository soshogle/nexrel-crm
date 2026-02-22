/**
 * Data Access Layer - Shared types
 * Phase 1: Foundation for Multi-DB Per-Industry architecture
 *
 * Industry param is optional in Phase 1 (single DB).
 * In Phase 3, industry will be used for DB routing.
 */

import type { Industry } from '@/lib/industry-menu-config';

export type { Industry };

/** Context passed to DAL methods - userId is required, industry for future routing */
export interface DalContext {
  userId: string;
  industry?: Industry | null;
}
