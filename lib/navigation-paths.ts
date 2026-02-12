/**
 * Valid navigation paths for the AI assistant
 * Used by navigate_to to allow opening any page on the user's menu
 */

// Paths that require admin role (AGENCY_ADMIN or SUPER_ADMIN)
const ADMIN_PATHS = [
  '/dashboard/settings',
  '/dashboard/team',
  '/dashboard/admin/analytics',
  '/dashboard/admin/permissions',
  '/dashboard/billing',
  '/dashboard/admin/booking-settings',
  '/dashboard/widgets',
];

// Paths that require SUPER_ADMIN only
const SUPER_ADMIN_PATHS = [
  '/dashboard/admin/manage-users',
  '/dashboard/admin/subscriptions',
];

export const VALID_NAVIGATION_PATHS = [
  // Core
  '/dashboard',
  '/dashboard/business-ai',
  '/dashboard/ai-employees',
  '/dashboard/voice-agents',
  '/dashboard/docpen',
  '/onboarding',
  '/dashboard/leads',
  '/dashboard/contacts',
  '/dashboard/pipeline',
  '/dashboard/tasks',
  '/dashboard/messages',
  '/dashboard/soshogle',
  '/dashboard/voice-agent',
  '/dashboard/calendar',
  // Reservations & ClubOS
  '/dashboard/reservations',
  '/dashboard/clubos/parent',
  '/dashboard/clubos/parent/family',
  '/dashboard/clubos/parent/schedules',
  '/dashboard/clubos/parent/payments',
  '/dashboard/clubos/admin',
  '/dashboard/clubos/teams',
  '/dashboard/clubos/parent-portal',
  '/dashboard/clubos/schedules',
  '/dashboard/clubos/payments',
  '/dashboard/clubos/communications',
  // Operations
  '/dashboard/delivery',
  '/dashboard/pos',
  '/dashboard/kitchen',
  '/dashboard/inventory',
  '/dashboard/general-inventory',
  '/dashboard/payments',
  '/dashboard/ecommerce',
  // AI & Workflows
  '/dashboard/ai-automations',
  '/dashboard/workflows',
  '/dashboard/reviews',
  '/dashboard/referrals',
  // Real Estate
  '/dashboard/real-estate',
  '/dashboard/real-estate/fsbo-leads',
  '/dashboard/real-estate/cma',
  '/dashboard/real-estate/market-insights',
  '/dashboard/real-estate/net-sheet',
  '/dashboard/real-estate/analytics',
  // Dental
  '/dashboard/dental-test',
  '/dashboard/dental/clinical',
  '/dashboard/dental/admin',
  // Websites
  '/dashboard/websites',
  // Admin
  '/dashboard/voice-agents/preview',
  '/dashboard/voice-ai/notifications',
  '/dashboard/team',
  '/dashboard/settings',
  '/dashboard/admin/analytics',
  '/dashboard/admin/permissions',
  '/dashboard/billing',
  '/dashboard/admin/booking-settings',
  '/dashboard/widgets',
  '/dashboard/admin/manage-users',
  '/dashboard/admin/subscriptions',
  '/dashboard/payments/data-monetization',
  '/dashboard/ecommerce/widgets',
] as const;

export type ValidPath = (typeof VALID_NAVIGATION_PATHS)[number];

/**
 * Check if a path is valid for navigation (internal app routes only)
 */
export function isValidNavigationPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  // Must start with /dashboard or /onboarding
  if (!path.startsWith('/dashboard') && !path.startsWith('/onboarding')) return false;
  // Prevent path traversal and external URLs
  if (path.includes('..') || path.includes('//') || path.includes('http') || path.includes('javascript:')) return false;
  return true;
}

/**
 * Check if user can navigate to a path (respects admin restrictions)
 */
export function canUserNavigateToPath(
  path: string,
  userRole: string | null | undefined
): boolean {
  if (!isValidNavigationPath(path)) return false;

  const normalizedPath = path.split('?')[0];

  // Super admin paths - only SUPER_ADMIN
  if (SUPER_ADMIN_PATHS.some((p) => normalizedPath === p || normalizedPath.startsWith(p + '/'))) {
    return userRole === 'SUPER_ADMIN';
  }

  // Admin paths - AGENCY_ADMIN or SUPER_ADMIN
  if (ADMIN_PATHS.some((p) => normalizedPath === p || normalizedPath.startsWith(p + '/'))) {
    return userRole === 'AGENCY_ADMIN' || userRole === 'SUPER_ADMIN';
  }

  return true;
}
