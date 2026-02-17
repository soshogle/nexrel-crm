
/**
 * Industry-specific menu configuration with Admin Override Support
 * Defines which menu items should be visible for each industry
 * Admins can override these defaults via UserFeatureToggle
 */

import { prisma } from '@/lib/db';

export type Industry =
  | 'ACCOUNTING'
  | 'RESTAURANT'
  | 'SPORTS_CLUB'
  | 'CONSTRUCTION'
  | 'LAW'
  | 'MEDICAL'
  | 'DENTIST'
  | 'MEDICAL_SPA'
  | 'OPTOMETRIST'
  | 'HEALTH_CLINIC'
  | 'REAL_ESTATE'
  | 'HOSPITAL'
  | 'TECHNOLOGY'
  | 'ORTHODONTIST';

export type MenuItemId =
  | 'dashboard'
  | 'business-ai'
  | 'ai-employees'
  | 'docpen'
  | 'onboarding'
  | 'leads'
  | 'contacts'
  | 'pipeline'
  | 'tasks'
  | 'messages'
  | 'soshogle'
  | 'voice-agent'
  | 'calendar'
  | 'reservations'
  | 'clubos-register'
  | 'clubos-admin'
  | 'clubos-teams'
  | 'clubos-parent-portal'
  | 'clubos-schedules'
  | 'clubos-payments'
  | 'clubos-communications'
  | 'clubos-parent-home'
  | 'clubos-parent-family'
  | 'clubos-parent-schedules'
  | 'clubos-parent-payments'
  | 'voice-agents'
  | 'voice-agent-preview'
  | 'voice-ai-notifications'
  | 'campaigns'
  | 'sms-campaigns'
  | 'reviews'
  | 'analytics'
  | 'workflows'
  | 'team'
  | 'reports'
  | 'kitchen'
  | 'pos'
  | 'delivery'
  | 'inventory'
  | 'general-inventory'
  | 'ecommerce'
  | 'payments'
  | 'billing'
  | 'credit-scoring'
  | 'data-monetization'
  | 'bnpl'
  | 'ach-settlement'
  | 'referrals'
  | 'widgets'
  | 'settings'
  | 'booking-settings'
  | 'permissions'
  | 'manage-users'
  | 'subscriptions'
  // Real Estate specific
  | 'real-estate-dashboard'
  | 'fsbo-leads'
  | 'cma-tools'
  | 'market-insights'
  | 'seller-net-sheet'
  | 'real-estate-analytics'
  // Dental/Orthodontist specific
  | 'dental-management'
  | 'dental-clinical'
  | 'dental-admin'
  // Website Builder
  | 'websites'
  // AI Automations
  | 'ai-automations';

// Core menu items visible to ALL industries
const CORE_MENU_ITEMS: MenuItemId[] = [
  'dashboard',
  'business-ai', // AI Brain - Revolutionary voice AI business intelligence with Voice Assistant + Analytical Dashboard - available to ALL industries
  'ai-employees', // AI Employees - automated assistants available to ALL industries
  // 'docpen' removed - only available to medical industries (MEDICAL, DENTIST, MEDICAL_SPA, OPTOMETRIST, HEALTH_CLINIC, HOSPITAL)
  'onboarding',
  'leads',
  'widgets', // Embeddable lead capture widget - available to ALL industries
  'contacts',
  'pipeline',
  'tasks',
  'messages',
  'soshogle', // Soshogle Multi-Channel - available to ALL industries
  'voice-agent', // Voice Agent call history - available to ALL industries
  'calendar',
  'voice-agents', // Voice AI Agent Management - Available ONLY to SUPER_ADMIN via Admin section
  'voice-agent-preview', // Voice Agent Preview Testing - Browser-based testing for all business owners
  'voice-ai-notifications', // Call Notifications Management - Available to all business owners
  'campaigns',
  'sms-campaigns', // SMS Campaign Management - Available to all industries
  'reviews',
  'analytics',
  'ai-automations', // AI Automations - Unified workflow and campaign builder
  'workflows',
  'team',
  'reports',
  // 'general-inventory' removed from core - only available to industries that need it (not REAL_ESTATE)
  'ecommerce', // E-commerce management for ALL industries
  'payments', // Payment processing for ALL industries
  'referrals', // Referral program for ALL industries
  'websites', // Website Builder - available to ALL industries
  'billing',
  'settings',
];

// Industry-specific menu configurations
const INDUSTRY_MENU_CONFIG: Record<Industry, MenuItemId[]> = {
  RESTAURANT: [
    ...CORE_MENU_ITEMS,
    'reservations',
    'kitchen',
    'pos',
    'delivery',
    'inventory',
    'general-inventory', // For restaurant inventory management
    'payments',
    'ecommerce',
    'widgets',
  ],

  SPORTS_CLUB: [
    ...CORE_MENU_ITEMS,
    // 'clubos-register' removed - only for parent/client portal
    'clubos-admin', // For program administration
    'clubos-teams', // For teams and leagues management
    'clubos-parent-portal', // Parent signup management (ADMIN ONLY)
    'clubos-schedules', // For games and practices
    'clubos-payments', // For registration payments
    'clubos-communications', // For email/SMS notifications
    'general-inventory', // For equipment and gear
    'payments',
    'ecommerce', // For merchandise
    'referrals', // Referral program
  ],

  CONSTRUCTION: [
    ...CORE_MENU_ITEMS,
    'general-inventory', // For tools and materials
    'payments',
    'ecommerce', // For materials/equipment
    'referrals',
  ],

  MEDICAL: [
    ...CORE_MENU_ITEMS,
    'docpen', // AI Docpen - Ambient medical scribe for medical practices
    'general-inventory', // For medical supplies
    'payments',
    'credit-scoring', // For payment plans
    'data-monetization',
    'bnpl', // Buy Now Pay Later for medical services
  ],

  DENTIST: [
    ...CORE_MENU_ITEMS,
    'docpen', // AI Docpen - Ambient medical scribe for dental practices
    'dental-management', // Dental practice management (legacy - redirects to clinical)
    'dental-clinical', // Clinical Dashboard (practitioner view)
    'dental-admin', // Administrative Dashboard (admin assistant view)
    'general-inventory', // For dental supplies
    'payments',
    'credit-scoring',
    'data-monetization',
    'bnpl',
  ],

  MEDICAL_SPA: [
    ...CORE_MENU_ITEMS,
    'docpen', // AI Docpen - Ambient medical scribe for medical spas
    'general-inventory', // For spa products and equipment
    'payments',
    'ecommerce', // For products
    'bnpl',
  ],

  OPTOMETRIST: [
    ...CORE_MENU_ITEMS,
    'docpen', // AI Docpen - Ambient medical scribe for optometry practices
    'general-inventory', // For frames, lenses, equipment
    'payments',
    'ecommerce', // For glasses/lenses
    'credit-scoring',
    'bnpl',
  ],

  HEALTH_CLINIC: [
    ...CORE_MENU_ITEMS,
    'docpen', // AI Docpen - Ambient medical scribe for health clinics
    'general-inventory', // For medical supplies
    'payments',
    'credit-scoring',
    'data-monetization',
    'bnpl',
  ],

  REAL_ESTATE: [
    ...CORE_MENU_ITEMS,
    // 'general-inventory' removed - not needed for real estate industry
    'payments',
    'ecommerce', // For property listings
    'credit-scoring', // For buyer qualification
    'referrals',
    // Real Estate specific features
    'real-estate-dashboard', // Real Estate overview dashboard
    'fsbo-leads', // For Sale By Owner lead generation
    'cma-tools', // Comparative Market Analysis tools
    'market-insights', // Market data and insights
    'seller-net-sheet', // Net sheet calculator for sellers
    'real-estate-analytics', // Real estate specific analytics
  ],

  HOSPITAL: [
    ...CORE_MENU_ITEMS,
    'docpen', // AI Docpen - Ambient medical scribe for hospitals
    'general-inventory', // For medical equipment and supplies
    'payments',
    'credit-scoring',
    'data-monetization',
    'bnpl',
    'ach-settlement',
  ],

  TECHNOLOGY: [
    ...CORE_MENU_ITEMS,
    'general-inventory', // For hardware, equipment
    'ecommerce', // For software/products
    'payments',
    'widgets',
    'referrals',
  ],
};

/**
 * Check if a menu item should be visible for a given industry
 */
export function isMenuItemVisible(
  menuItemId: MenuItemId,
  industry: Industry | null | undefined
): boolean {
  // If no industry is set, only show core items
  if (!industry) {
    return CORE_MENU_ITEMS.includes(menuItemId);
  }

  const allowedItems = INDUSTRY_MENU_CONFIG[industry as Industry];
  // Fallback to core items if industry not in config (e.g. new industry type)
  if (!allowedItems) {
    return CORE_MENU_ITEMS.includes(menuItemId);
  }
  return allowedItems.includes(menuItemId);
}

/**
 * Get all visible menu items for a given industry
 */
export function getVisibleMenuItems(
  industry: Industry | null | undefined
): MenuItemId[] {
  if (!industry) {
    return CORE_MENU_ITEMS;
  }

  return INDUSTRY_MENU_CONFIG[industry];
}

/**
 * Get industry display name
 */
export function getIndustryDisplayName(industry: Industry): string {
  const displayNames: Record<Industry, string> = {
    RESTAURANT: 'Restaurant',
    SPORTS_CLUB: 'Sports Club',
    CONSTRUCTION: 'Construction',
    MEDICAL: 'Medical',
    DENTIST: 'Dentist',
    MEDICAL_SPA: 'Medical Spa',
    OPTOMETRIST: 'Optometrist',
    HEALTH_CLINIC: 'Health Clinic',
    REAL_ESTATE: 'Real Estate',
    HOSPITAL: 'Hospital',
    TECHNOLOGY: 'Technology',
  };

  return displayNames[industry];
}

/**
 * Get visible menu items for a user (with admin overrides)
 * This function merges industry defaults with admin feature toggles
 */
export async function getMenuItemsForUser(
  userId: string,
  industry: Industry | null | undefined
): Promise<MenuItemId[]> {
  try {
    // Start with industry defaults
    const industryItems = industry ? INDUSTRY_MENU_CONFIG[industry] : CORE_MENU_ITEMS;
    
    // Get user's feature toggles
    const featureToggles = await prisma.userFeatureToggle.findMany({
      where: { userId },
    });

    // If no toggles, return industry defaults
    if (featureToggles.length === 0) {
      return industryItems;
    }

    // Create a set for fast lookup
    const finalItems = new Set(industryItems);

    // Apply feature toggles
    featureToggles.forEach((toggle: any) => {
      if (toggle.enabled) {
        // Add feature if enabled
        finalItems.add(toggle.feature as MenuItemId);
      } else {
        // Remove feature if disabled
        finalItems.delete(toggle.feature as MenuItemId);
      }
    });

    return Array.from(finalItems);
  } catch (error) {
    console.error('❌ Error fetching menu items for user:', error);
    // Fallback to industry defaults on error
    return industry ? INDUSTRY_MENU_CONFIG[industry] : CORE_MENU_ITEMS;
  }
}

/**
 * Get all available features (for admin feature toggle UI)
 */
export function getAllFeatures(): {
  id: MenuItemId;
  label: string;
  category: string;
}[] {
  return [
    // Core CRM
    { id: 'dashboard', label: 'Dashboard', category: 'Core CRM' },
    { id: 'onboarding', label: 'Onboarding', category: 'Core CRM' },
    { id: 'leads', label: 'Contacts & Leads', category: 'Core CRM' },
    { id: 'contacts', label: 'Contacts Management', category: 'Core CRM' },
    { id: 'pipeline', label: 'Pipeline/Deals', category: 'Core CRM' },
    { id: 'messages', label: 'Messaging (SMS/Email)', category: 'Core CRM' },
    { id: 'voice-agent', label: 'Voice Agent', category: 'Core CRM' },
    { id: 'calendar', label: 'Calendar/Appointments', category: 'Core CRM' },
    { id: 'campaigns', label: 'Campaigns', category: 'Core CRM' },
    { id: 'workflows', label: 'Workflows & Automation', category: 'Core CRM' },
    { id: 'team', label: 'Team Management', category: 'Core CRM' },
    { id: 'reports', label: 'Reports', category: 'Core CRM' },
    { id: 'analytics', label: 'Analytics', category: 'Core CRM' },
    { id: 'settings', label: 'Settings', category: 'Core CRM' },

    // Communication & AI
    { id: 'voice-agents', label: 'Voice AI Agents', category: 'Communication & AI' },
    { id: 'reviews', label: 'Review Management', category: 'Communication & AI' },

    // Restaurant Features
    { id: 'reservations', label: 'Reservations', category: 'Restaurant' },
    { id: 'pos', label: 'POS System', category: 'Restaurant' },
    { id: 'kitchen', label: 'Kitchen Display', category: 'Restaurant' },
    { id: 'delivery', label: 'Delivery Tracking', category: 'Restaurant' },
    { id: 'inventory', label: 'Inventory Management', category: 'Restaurant' },

    // E-commerce & Payments
    { id: 'ecommerce', label: 'E-commerce', category: 'E-commerce & Payments' },
    { id: 'payments', label: 'Payments', category: 'E-commerce & Payments' },
    { id: 'credit-scoring', label: 'Credit Scoring', category: 'E-commerce & Payments' },
    { id: 'bnpl', label: 'Buy Now Pay Later', category: 'E-commerce & Payments' },
    { id: 'ach-settlement', label: 'ACH Settlement', category: 'E-commerce & Payments' },

    // Advanced Features
    { id: 'data-monetization', label: 'Data Monetization', category: 'Advanced' },
    { id: 'referrals', label: 'Referral Program', category: 'Advanced' },
    { id: 'widgets', label: 'Embeddable Widgets', category: 'Advanced' },

    // Real Estate Features
    { id: 'real-estate-dashboard', label: 'Real Estate Hub', category: 'Real Estate' },
    { id: 'fsbo-leads', label: 'FSBO Leads', category: 'Real Estate' },
    { id: 'cma-tools', label: 'CMA Tools', category: 'Real Estate' },
    { id: 'market-insights', label: 'Market Insights', category: 'Real Estate' },
    { id: 'seller-net-sheet', label: 'Seller Net Sheet', category: 'Real Estate' },
    { id: 'real-estate-analytics', label: 'RE Analytics', category: 'Real Estate' },

    // Dental/Orthodontist Features
    { id: 'dental-management', label: 'Dental Management', category: 'Dental/Orthodontist' },
    { id: 'dental-clinical', label: 'Clinical Dashboard', category: 'Dental/Orthodontist' },
    { id: 'dental-admin', label: 'Administrative Dashboard', category: 'Dental/Orthodontist' },
  ];
}
