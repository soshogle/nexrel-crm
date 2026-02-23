/**
 * Task config helper - enforce owner toggles
 * Used by cron and executors to respect AIEmployeeTaskConfig
 */

import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';

/**
 * Check if an employee should run at all (at least one task enabled).
 * If no config exists, default to true (backward compat).
 */
export async function shouldRunEmployee(
  userId: string,
  source: 'industry' | 're' | 'professional',
  industry: Industry | null,
  employeeType: string
): Promise<boolean> {
  const configs = await (prisma as any).aIEmployeeTaskConfig.findMany({
    where: {
      userId,
      source,
      industry: source === 'industry' ? industry : null,
      employeeType,
    },
  });

  if (configs.length === 0) return true; // No config = run (default)
  const anyEnabled = configs.some((c: any) => c.enabled === true);
  return anyEnabled;
}

/**
 * Get set of enabled task keys for an employee.
 * Task keys not in config default to enabled.
 */
export async function getEnabledTaskKeys(
  userId: string,
  source: 'industry' | 're' | 'professional',
  industry: Industry | null,
  employeeType: string
): Promise<Set<string>> {
  const configs = await (prisma as any).aIEmployeeTaskConfig.findMany({
    where: {
      userId,
      source,
      industry: source === 'industry' ? industry : null,
      employeeType,
    },
  });

  const enabled = new Set<string>();
  for (const c of configs) {
    if (c.enabled) enabled.add(c.taskKey);
  }

  // If no configs at all, treat as "all enabled" (backward compat)
  if (configs.length === 0) return new Set(['run']);

  return enabled;
}

/**
 * Check if a specific task key is enabled.
 * If no config for that key, default to true.
 */
export async function isTaskEnabled(
  userId: string,
  source: 'industry' | 're' | 'professional',
  industry: Industry | null,
  employeeType: string,
  taskKey: string
): Promise<boolean> {
  // findFirst: Prisma compound unique with nullable industry rejects null in findUnique where
  const config = await (prisma as any).aIEmployeeTaskConfig.findFirst({
    where: {
      userId,
      source,
      industry: source === 'industry' ? industry : null,
      employeeType,
      taskKey,
    },
  });

  if (!config) return true; // No config = enabled (default)
  return config.enabled === true;
}
