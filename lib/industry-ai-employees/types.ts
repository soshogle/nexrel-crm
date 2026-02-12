/**
 * Industry AI Employee Types
 * Shared types for all industry-specific AI employee implementations
 */

import { Industry } from '@prisma/client';

export interface IndustryEmployeeConfig {
  type: string;
  name: string;
  title: string;
  description: string;
  fullDescription: string;
  capabilities: string[];
  voiceEnabled: boolean;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  // UI - same as RE cards
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string; // Lucide icon name: Calendar, FileText, Users, etc.
}

export interface IndustryEmployeePrompt {
  name: string;
  description: string;
  systemPrompt: string;
  firstMessage: string;
  voiceId?: string;
}

export interface IndustryAIEmployeeModule {
  industry: Industry;
  employeeTypes: string[];
  configs: Record<string, IndustryEmployeeConfig>;
  prompts: Record<string, IndustryEmployeePrompt>;
  fieldLabels: {
    contact: string;
    deal: string;
  };
}
