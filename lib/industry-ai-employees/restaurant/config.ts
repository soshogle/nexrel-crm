/**
 * Restaurant Industry AI Employee Configurations
 */

import type { IndustryEmployeeConfig } from '../types';

export const RESTAURANT_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  RESERVATION_COORDINATOR: {
    type: 'RESERVATION_COORDINATOR',
    name: 'Sarah',
    title: 'Reservation Coordinator',
    description: 'Handles reservations and table management',
    fullDescription: 'Takes reservations, confirms bookings, and manages table availability.',
    capabilities: ['Reservations', 'Confirmations', 'Modifications', 'Special requests'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'reservations',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: 'Calendar',
  },
  CATERING_INQUIRY: {
    type: 'CATERING_INQUIRY',
    name: 'Michael',
    title: 'Catering Inquiry Coordinator',
    description: 'Handles catering and private event inquiries',
    fullDescription: 'Responds to catering inquiries, collects event details, and schedules consultations.',
    capabilities: ['Catering inquiries', 'Event details', 'Consultation scheduling', 'Menu information'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'catering',
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    icon: 'MessageSquare',
  },
  CUSTOMER_FOLLOWUP: {
    type: 'CUSTOMER_FOLLOWUP',
    name: 'Jennifer',
    title: 'Customer Follow-up Coordinator',
    description: 'Follow-up on feedback and repeat visits',
    fullDescription: 'Follows up after visits, collects feedback, and promotes specials or events.',
    capabilities: ['Post-visit follow-up', 'Feedback collection', 'Specials promotion', 'Loyalty programs'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'marketing',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'MessageSquare',
  },
};
