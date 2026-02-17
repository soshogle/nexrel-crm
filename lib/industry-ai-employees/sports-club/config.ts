/**
 * Sports Club Industry AI Employee Configurations
 */

import type { IndustryEmployeeConfig } from '../types';

export const SPORTS_CLUB_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  REGISTRATION_COORDINATOR: {
    type: 'REGISTRATION_COORDINATOR',
    name: 'Sarah',
    title: 'Registration Coordinator',
    description: 'Handles program registration and enrollment',
    fullDescription: 'Processes registrations for leagues, camps, and programs. Answers questions about programs and availability.',
    capabilities: ['Program registration', 'Enrollment', 'Availability', 'Pricing'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'registration',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'UserPlus',
  },
  PROGRAM_SCHEDULER: {
    type: 'PROGRAM_SCHEDULER',
    name: 'Michael',
    title: 'Program Scheduler',
    description: 'Schedules practices, games, and events',
    fullDescription: 'Manages program schedules, handles schedule changes, and communicates with participants.',
    capabilities: ['Schedule management', 'Practice scheduling', 'Game coordination', 'Event reminders'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'scheduling',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: 'Calendar',
  },
  MEMBER_SERVICES: {
    type: 'MEMBER_SERVICES',
    name: 'Jennifer',
    title: 'Member Services Coordinator',
    description: 'Member support and retention',
    fullDescription: 'Handles member questions, renewals, and general support. Promotes programs and membership benefits.',
    capabilities: ['Member support', 'Renewals', 'Program promotion', 'General inquiries'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'membership',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: 'Users',
  },
};
