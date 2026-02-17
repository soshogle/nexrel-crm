/**
 * Professional AI Employee Configurations
 * 12 expert roles with deep domain expertise - available to ALL users
 * RE-style cards, workflow/campaign integration, voice + text
 */

import type { LucideIcon } from 'lucide-react';
import {
  Calculator,
  Code2,
  Scale,
  Search,
  Megaphone,
  Handshake,
  Headphones,
  Users,
  BarChart3,
  FileText,
  DollarSign,
  ClipboardList,
} from 'lucide-react';

export type ProfessionalAIEmployeeType =
  | 'ACCOUNTANT'
  | 'DEVELOPER'
  | 'LEGAL_ASSISTANT'
  | 'RESEARCHER'
  | 'MARKETING_SPECIALIST'
  | 'SALES_REPRESENTATIVE'
  | 'CUSTOMER_SUPPORT'
  | 'HR_SPECIALIST'
  | 'DATA_ANALYST'
  | 'CONTENT_WRITER'
  | 'FINANCIAL_ADVISOR'
  | 'PROJECT_MANAGER';

export interface ProfessionalEmployeeConfig {
  type: ProfessionalAIEmployeeType;
  name: string;
  title: string;
  description: string;
  fullDescription: string;
  capabilities: string[];
  voiceEnabled: boolean;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
}

export const PROFESSIONAL_EMPLOYEE_CONFIGS: Record<ProfessionalAIEmployeeType, ProfessionalEmployeeConfig> = {
  ACCOUNTANT: {
    type: 'ACCOUNTANT',
    name: 'Sarah',
    title: 'AI Accountant',
    description: 'Tax solutions, Quebec tax code, financial reporting',
    fullDescription: 'Expert in tax preparation, Quebec provincial and federal tax code, GST/QST, financial statements, and accounting best practices. Assists with tax planning, deductions, and compliance.',
    capabilities: ['Quebec tax code', 'GST/QST', 'Tax planning', 'Financial reports', 'Compliance'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'finance',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: Calculator,
  },
  DEVELOPER: {
    type: 'DEVELOPER',
    name: 'Alex',
    title: 'AI Developer',
    description: 'Code generation, debugging, technical solutions',
    fullDescription: 'Expert in multiple programming languages. Can write, review, and debug code. Provides technical documentation, architecture advice, and implementation guidance.',
    capabilities: ['Code generation', 'Debugging', 'Code review', 'Documentation', 'Technical guidance'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'technology',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Code2,
  },
  LEGAL_ASSISTANT: {
    type: 'LEGAL_ASSISTANT',
    name: 'Jennifer',
    title: 'AI Legal Assistant',
    description: 'Legal research, contract review, compliance',
    fullDescription: 'Assists with legal research, contract drafting and review, compliance checks, and case preparation. Knowledgeable in common law and civil law (Quebec). Escalates to licensed attorneys for legal advice.',
    capabilities: ['Legal research', 'Contract review', 'Compliance', 'Case prep', 'Document drafting'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'legal',
    color: 'from-slate-600 to-slate-800',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: Scale,
  },
  RESEARCHER: {
    type: 'RESEARCHER',
    name: 'Michael',
    title: 'AI Researcher',
    description: 'Deep research, fact-finding, competitive analysis',
    fullDescription: 'Conducts thorough research on any topic. Can analyze markets, competitors, trends, and data. Produces summaries, reports, and actionable insights. Uses web search and document analysis.',
    capabilities: ['Web research', 'Market analysis', 'Competitive intel', 'Trend reports', 'Fact-checking'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'research',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    icon: Search,
  },
  MARKETING_SPECIALIST: {
    type: 'MARKETING_SPECIALIST',
    name: 'Emma',
    title: 'AI Marketing Specialist',
    description: 'Campaign strategy, analytics, audience targeting',
    fullDescription: 'Expert in digital marketing, campaign strategy, SEO/SEM, social media, and analytics. Creates marketing plans, analyzes performance, and recommends optimizations.',
    capabilities: ['Campaign strategy', 'SEO/SEM', 'Social media', 'Analytics', 'Audience targeting'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'marketing',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    icon: Megaphone,
  },
  SALES_REPRESENTATIVE: {
    type: 'SALES_REPRESENTATIVE',
    name: 'David',
    title: 'AI Sales Representative',
    description: 'Lead follow-up, proposals, deal support',
    fullDescription: 'Handles lead follow-up, creates proposals, supports negotiations, and manages sales pipelines. Skilled in objection handling and closing techniques.',
    capabilities: ['Lead follow-up', 'Proposals', 'Objection handling', 'Pipeline management', 'Deal support'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'sales',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: Handshake,
  },
  CUSTOMER_SUPPORT: {
    type: 'CUSTOMER_SUPPORT',
    name: 'Nicole',
    title: 'AI Customer Support',
    description: 'Ticket handling, FAQ, customer inquiries',
    fullDescription: 'Handles customer inquiries, ticket resolution, FAQ responses, and escalations. Empathetic and solution-oriented. Can access knowledge bases and escalate when needed.',
    capabilities: ['Ticket handling', 'FAQ', 'Inquiry resolution', 'Escalation', 'Knowledge base'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'support',
    color: 'from-cyan-500 to-teal-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: Headphones,
  },
  HR_SPECIALIST: {
    type: 'HR_SPECIALIST',
    name: 'Jessica',
    title: 'AI HR Specialist',
    description: 'Recruitment, onboarding, HR policies',
    fullDescription: 'Assists with recruitment, onboarding, HR policies, employee relations, and compliance. Knowledgeable in employment law basics. Escalates complex matters.',
    capabilities: ['Recruitment', 'Onboarding', 'HR policies', 'Employee relations', 'Compliance'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'hr',
    color: 'from-indigo-500 to-violet-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    icon: Users,
  },
  DATA_ANALYST: {
    type: 'DATA_ANALYST',
    name: 'Ryan',
    title: 'AI Data Analyst',
    description: 'Reports, dashboards, data insights',
    fullDescription: 'Creates reports, dashboards, and data visualizations. Performs statistical analysis, identifies trends, and provides actionable insights. Works with spreadsheets and data tools.',
    capabilities: ['Reports', 'Dashboards', 'Statistical analysis', 'Data viz', 'Insights'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'analytics',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: BarChart3,
  },
  CONTENT_WRITER: {
    type: 'CONTENT_WRITER',
    name: 'Sophie',
    title: 'AI Content Writer',
    description: 'Copy, blogs, marketing content',
    fullDescription: 'Writes marketing copy, blog posts, emails, social media content, and documentation. Adapts tone and style. SEO-aware and engaging.',
    capabilities: ['Marketing copy', 'Blogs', 'Emails', 'Social media', 'SEO content'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'content',
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    icon: FileText,
  },
  FINANCIAL_ADVISOR: {
    type: 'FINANCIAL_ADVISOR',
    name: 'James',
    title: 'AI Financial Advisor',
    description: 'Financial planning, investment basics',
    fullDescription: 'Assists with financial planning, budgeting, investment basics, and retirement planning. Provides educational information. Escalates to licensed advisors for specific advice.',
    capabilities: ['Financial planning', 'Budgeting', 'Investment basics', 'Retirement', 'Education'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'finance',
    color: 'from-yellow-500 to-amber-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: DollarSign,
  },
  PROJECT_MANAGER: {
    type: 'PROJECT_MANAGER',
    name: 'Chris',
    title: 'AI Project Manager',
    description: 'Task coordination, timelines, team updates',
    fullDescription: 'Coordinates tasks, tracks timelines, manages project updates, and facilitates communication. Creates project plans, status reports, and helps with resource allocation.',
    capabilities: ['Task coordination', 'Timelines', 'Status reports', 'Resource allocation', 'Team updates'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'operations',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: ClipboardList,
  },
};

export const PROFESSIONAL_EMPLOYEE_TYPES = Object.keys(PROFESSIONAL_EMPLOYEE_CONFIGS) as ProfessionalAIEmployeeType[];
