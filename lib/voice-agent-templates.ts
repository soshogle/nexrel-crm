/**
 * Voice AI Agent Templates - Industry-geared, 12 roles max per user
 * Clear names like "Sales Assistant", "Support Agent" for multi-agent scenarios
 */

import type { Industry } from '@/lib/industry-menu-config';

export const VOICE_AGENT_LIMIT = 12;

export interface VoiceAgentTemplate {
  id: string;
  name: string;
  description: string;
  avatarEmoji: string; // Fallback when no image
  promptSnippet: string; // Industry-specific addition to base prompt
}

const BASE_TEMPLATES: Omit<VoiceAgentTemplate, 'promptSnippet'>[] = [
  { id: 'sales_assistant', name: 'Sales Assistant', description: 'Handles sales calls, product inquiries, and lead qualification', avatarEmoji: '📊' },
  { id: 'support_agent', name: 'Support Agent', description: 'Customer support, troubleshooting, and general inquiries', avatarEmoji: '🎧' },
  { id: 'scheduling_assistant', name: 'Scheduling Assistant', description: 'Books appointments, manages calendar, and confirms bookings', avatarEmoji: '📅' },
  { id: 'receptionist', name: 'Receptionist', description: 'Front desk, call routing, and general business inquiries', avatarEmoji: '📞' },
  { id: 'lead_qualifier', name: 'Lead Qualifier', description: 'Screens leads, qualifies interest, and schedules callbacks', avatarEmoji: '🎯' },
  { id: 'follow_up_agent', name: 'Follow-Up Agent', description: 'Outbound follow-ups, reminders, and re-engagement', avatarEmoji: '🔄' },
  { id: 'appointment_reminder', name: 'Appointment Reminder', description: 'Confirms and reminds about upcoming appointments', avatarEmoji: '⏰' },
  { id: 'survey_agent', name: 'Survey Agent', description: 'Conducts surveys, collects feedback, and NPS calls', avatarEmoji: '📋' },
  { id: 'collections_agent', name: 'Collections Agent', description: 'Payment reminders and account follow-ups', avatarEmoji: '💳' },
  { id: 'onboarding_agent', name: 'Onboarding Agent', description: 'Welcomes new customers, explains services, and guides setup', avatarEmoji: '👋' },
  { id: 'booking_agent', name: 'Booking Agent', description: 'Reservations, orders, and service bookings', avatarEmoji: '📝' },
  { id: 'general_assistant', name: 'General Assistant', description: 'General inquiries, FAQ, and call routing', avatarEmoji: '🤖' },
];

// Industry-specific prompt additions for each template
const INDUSTRY_PROMPTS: Record<Industry, string> = {
  RESTAURANT: 'You represent a restaurant. Help with reservations, takeout orders, hours, menu questions, and special events.',
  SPORTS_CLUB: 'You represent a sports club or gym. Help with class schedules, membership inquiries, registration, and facility info.',
  CONSTRUCTION: 'You represent a construction company. Help with project inquiries, estimates, scheduling site visits, and contractor availability.',
  MEDICAL: 'You represent a medical practice. Help with appointment scheduling, office hours, insurance questions, and patient inquiries. Be HIPAA-conscious.',
  DENTIST: 'You represent a dental practice. Help with appointment scheduling, teeth cleaning, procedures, insurance, and office hours.',
  MEDICAL_SPA: 'You represent a medical spa. Help with treatments, appointments, pricing, and service inquiries.',
  OPTOMETRIST: 'You represent an optometry practice. Help with eye exams, contact lenses, glasses, and appointment scheduling.',
  HEALTH_CLINIC: 'You represent a health clinic. Help with appointments, services, and general patient inquiries.',
  REAL_ESTATE: 'You represent a real estate agency. Help with property listings, showings, open houses, and buyer/seller inquiries.',
  HOSPITAL: 'You represent a hospital. Help with department info, visiting hours, and general inquiries. Route to appropriate departments.',
  TECHNOLOGY: 'You represent a tech company. Help with product inquiries, support, demos, and general business inquiries.',
};

export function getVoiceAgentTemplates(industry: Industry | null): VoiceAgentTemplate[] {
  const industryPrompt = industry ? INDUSTRY_PROMPTS[industry] || '' : 'Act professionally and help the caller with their needs.';
  return BASE_TEMPLATES.map((t) => ({
    ...t,
    promptSnippet: industryPrompt,
  }));
}

export function getTemplateById(id: string, industry: Industry | null): VoiceAgentTemplate | undefined {
  return getVoiceAgentTemplates(industry).find((t) => t.id === id);
}

export function getDefaultTemplateForRole(role: string, industry: Industry | null): VoiceAgentTemplate | undefined {
  const roleMap: Record<string, string> = {
    sales: 'sales_assistant',
    support: 'support_agent',
    scheduling: 'scheduling_assistant',
    receptionist: 'receptionist',
    lead: 'lead_qualifier',
    follow_up: 'follow_up_agent',
    reminder: 'appointment_reminder',
    survey: 'survey_agent',
    collections: 'collections_agent',
    onboarding: 'onboarding_agent',
    booking: 'booking_agent',
    default: 'general_assistant',
  };
  const templateId = roleMap[role.toLowerCase()] || roleMap.default;
  return getTemplateById(templateId, industry);
}
