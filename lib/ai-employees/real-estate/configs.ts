/**
 * Real Estate AI Employee Configurations - Stub
 * Full implementation pending Vercel Prisma sync
 */

export interface REEmployeeConfig {
  type: string;
  name: string;
  description: string;
  capabilities: string[];
  voiceEnabled: boolean;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedDuration: number;
  triggers: string[];
  requiredData: string[];
}

export const RE_EMPLOYEE_CONFIGS: Record<string, REEmployeeConfig> = {};

export function getREEmployeeConfig(type: string): REEmployeeConfig | null {
  return RE_EMPLOYEE_CONFIGS[type] || null;
}

export function getAllREEmployeeTypes(): string[] {
  return Object.keys(RE_EMPLOYEE_CONFIGS);
}

export function isREEmployeeType(type: string): boolean {
  return type in RE_EMPLOYEE_CONFIGS;
}
