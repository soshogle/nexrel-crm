
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { isMenuItemVisible, type Industry, type MenuItemId } from '@/lib/industry-menu-config';
import AdminAuthDialog from '@/components/admin/admin-auth-dialog';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  CalendarClock,
  Phone,
  Briefcase,
  Settings,
  TrendingUp,
  Workflow,
  UserPlus,
  Mail,
  Star,
  ShoppingCart,
  CreditCard,
  Building2,
  Shield,
  Repeat,
  Wallet,
  Code,
  DollarSign,
  ChevronDown,
  Truck,
  Database,
  ShieldAlert,
  ChefHat,
  Package,
  Rocket,
  LogOut,
  User,
  UserCheck,
  Home,
  ListTodo,
  Lock,
  Mic,
  Brain,
  Bot,
  Stethoscope,
  ClipboardList,
  Globe,
  Sparkles,
} from 'lucide-react';

// Parent Portal items - what parents see when they log in
const parentItems = [
  {
    id: 'parent-dashboard' as MenuItemId,
    title: 'My Dashboard',
    href: '/dashboard/clubos/parent',
    icon: LayoutDashboard,
  },
  {
    id: 'parent-family' as MenuItemId,
    title: 'My Family',
    href: '/dashboard/clubos/parent/family',
    icon: Users,
  },
  {
    id: 'parent-schedules' as MenuItemId,
    title: 'My Schedules',
    href: '/dashboard/clubos/parent/schedules',
    icon: Calendar,
  },
  {
    id: 'parent-payments' as MenuItemId,
    title: 'My Payments',
    href: '/dashboard/clubos/parent/payments',
    icon: DollarSign,
  },
];

// Merchant/Staff items - what they need daily
const merchantItems = [
  {
    id: 'dashboard' as MenuItemId,
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'business-ai' as MenuItemId,
    title: 'AI Brain',
    href: '/dashboard/business-ai',
    icon: Brain,
  },
  {
    id: 'ai-employees' as MenuItemId,
    title: 'AI Employees',
    href: '/dashboard/ai-employees',
    icon: Bot,
  },
  {
    id: 'voice-agents' as MenuItemId,
    title: 'Voice AI Agents',
    href: '/dashboard/voice-agents',
    icon: Phone,
  },
  {
    id: 'docpen' as MenuItemId,
    title: 'AI Docpen',
    href: '/dashboard/docpen',
    icon: Mic,
  },
  {
    id: 'onboarding' as MenuItemId,
    title: 'Onboarding Wizard',
    href: '/onboarding',
    icon: Rocket,
  },
  {
    id: 'leads' as MenuItemId,
    title: 'Leads',
    href: '/dashboard/leads',
    icon: UserPlus,
  },
  {
    id: 'contacts' as MenuItemId,
    title: 'Contacts',
    href: '/dashboard/contacts',
    icon: Users,
  },
  {
    id: 'pipeline' as MenuItemId,
    title: 'Pipeline',
    href: '/dashboard/pipeline',
    icon: Briefcase,
  },

  {
    id: 'messages' as MenuItemId,
    title: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
  },
  {
    id: 'soshogle' as MenuItemId,
    title: 'Soshogle Multi-Channel',
    href: '/dashboard/soshogle',
    icon: MessageSquare,
  },
  {
    id: 'voice-agent' as MenuItemId,
    title: 'Call History',
    href: '/dashboard/voice-agent',
    icon: Phone,
  },
  {
    id: 'calendar' as MenuItemId,
    title: 'Appointments',
    href: '/dashboard/calendar',
    icon: Calendar,
  },
  {
    id: 'reservations' as MenuItemId,
    title: 'Reservations',
    href: '/dashboard/reservations',
    icon: CalendarClock,
  },
  // NOTE: 'clubos-register' removed - only for parent/client portal, not business owners
  {
    id: 'clubos-admin' as MenuItemId,
    title: 'ClubOS Admin',
    href: '/dashboard/clubos/admin',
    icon: Shield,
  },
  {
    id: 'clubos-teams' as MenuItemId,
    title: 'Teams & Leagues',
    href: '/dashboard/clubos/teams',
    icon: Users,
  },
  {
    id: 'clubos-parent-portal' as MenuItemId,
    title: 'Client Portal',
    href: '/dashboard/clubos/parent-portal',
    icon: UserCheck,
  },
  {
    id: 'clubos-schedules' as MenuItemId,
    title: 'Schedules',
    href: '/dashboard/clubos/schedules',
    icon: Calendar,
  },
  {
    id: 'clubos-payments' as MenuItemId,
    title: 'Payments',
    href: '/dashboard/clubos/payments',
    icon: DollarSign,
  },
  {
    id: 'clubos-communications' as MenuItemId,
    title: 'Communications',
    href: '/dashboard/clubos/communications',
    icon: MessageSquare,
  },
  {
    id: 'delivery' as MenuItemId,
    title: 'Delivery',
    href: '/dashboard/delivery',
    icon: Truck,
  },
  {
    id: 'pos' as MenuItemId,
    title: 'POS',
    href: '/dashboard/pos',
    icon: CreditCard,
  },
  {
    id: 'kitchen' as MenuItemId,
    title: 'Kitchen Display',
    href: '/dashboard/kitchen',
    icon: ChefHat,
  },
  {
    id: 'inventory' as MenuItemId,
    title: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
  },
  {
    id: 'general-inventory' as MenuItemId,
    title: 'Inventory',
    href: '/dashboard/general-inventory',
    icon: Package,
  },
  {
    id: 'payments' as MenuItemId,
    title: 'Payments',
    href: '/dashboard/payments',
    icon: DollarSign,
  },
  {
    id: 'ecommerce' as MenuItemId,
    title: 'E-commerce',
    href: '/dashboard/ecommerce',
    icon: ShoppingCart,
  },
  // Voice Agents moved to admin section - only business owner can configure
  {
    id: 'ai-automations' as MenuItemId,
    title: 'AI Automations',
    href: '/dashboard/ai-automations',
    icon: Sparkles,
  },
  {
    id: 'workflows' as MenuItemId,
    title: 'Workflows',
    href: '/dashboard/workflows',
    icon: Workflow,
  },
  {
    id: 'reports' as MenuItemId,
    title: 'Reports',
    href: '/dashboard/reports',
    icon: TrendingUp,
  },
  {
    id: 'reviews' as MenuItemId,
    title: 'Reviews',
    href: '/dashboard/reviews',
    icon: Star,
  },
  {
    id: 'referrals' as MenuItemId,
    title: 'Referrals',
    href: '/dashboard/referrals',
    icon: Repeat,
  },
  // Real Estate specific items - only visible to REAL_ESTATE industry
  {
    id: 'real-estate-dashboard' as MenuItemId,
    title: 'Real Estate Hub',
    href: '/dashboard/real-estate',
    icon: Home,
  },
  {
    id: 'fsbo-leads' as MenuItemId,
    title: 'FSBO Leads',
    href: '/dashboard/real-estate/fsbo-leads',
    icon: UserPlus,
  },
  {
    id: 'cma-tools' as MenuItemId,
    title: 'CMA Tools',
    href: '/dashboard/real-estate/cma',
    icon: TrendingUp,
  },
  {
    id: 'market-insights' as MenuItemId,
    title: 'Market Insights',
    href: '/dashboard/real-estate/market-insights',
    icon: TrendingUp,
  },
  {
    id: 'seller-net-sheet' as MenuItemId,
    title: 'Seller Net Sheet',
    href: '/dashboard/real-estate/net-sheet',
    icon: DollarSign,
  },
  {
    id: 'real-estate-analytics' as MenuItemId,
    title: 'RE Analytics',
    href: '/dashboard/real-estate/analytics',
    icon: TrendingUp,
  },
  // Dental/Orthodontist specific items - only visible to DENTIST industry
  {
    id: 'dental-management' as MenuItemId,
    title: 'Dental Management',
    href: '/dashboard/dental-test',
    icon: Stethoscope,
  },
  {
    id: 'dental-clinical' as MenuItemId,
    title: 'Clinical Dashboard',
    href: '/dashboard/dental/clinical',
    icon: Stethoscope,
  },
  {
    id: 'dental-admin' as MenuItemId,
    title: 'Administrative Dashboard',
    href: '/dashboard/dental/admin',
    icon: ClipboardList,
  },
  {
    id: 'websites' as MenuItemId,
    title: 'Websites',
    href: '/dashboard/websites',
    icon: Globe,
  },
];

// Admin items - Secure section requiring re-authentication
// These pages control sensitive business operations and staff management
const adminItems = [
  {
    id: 'voice-agent-preview' as MenuItemId,
    title: 'Test Voice Agent',
    href: '/dashboard/voice-agents/preview',
    icon: Mic,
    requiresSuperAdmin: false, // Allow all business owners to test their agents
  },
  {
    id: 'voice-ai-notifications' as MenuItemId,
    title: 'Call Notifications',
    href: '/dashboard/voice-ai/notifications',
    icon: Mail,
    requiresAdmin: false, // Allow all business owners to manage notifications
  },
  {
    id: 'team' as MenuItemId,
    title: 'Team Management',
    href: '/dashboard/team',
    icon: Users,
    requiresAdmin: true,
  },
  {
    id: 'settings' as MenuItemId,
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    requiresAdmin: true,
  },
  {
    id: 'analytics' as MenuItemId,
    title: 'Analytics',
    href: '/dashboard/admin/analytics',
    icon: TrendingUp,
    requiresAdmin: true,
  },
  {
    id: 'permissions' as MenuItemId,
    title: 'User Permissions',
    href: '/dashboard/admin/permissions',
    icon: ShieldAlert,
    requiresAdmin: true,
  },
  {
    id: 'billing' as MenuItemId,
    title: 'Billing / Subscription',
    href: '/dashboard/billing',
    icon: CreditCard,
    requiresAdmin: true,
  },
  {
    id: 'booking-settings' as MenuItemId,
    title: 'Booking Settings',
    href: '/dashboard/admin/booking-settings',
    icon: CalendarClock,
    requiresAdmin: true,
  },
  {
    id: 'widgets' as MenuItemId,
    title: 'Embed Widget',
    href: '/dashboard/widgets',
    icon: Code,
    requiresAdmin: true,
  },
  // Super Admin Only Items
  {
    id: 'manage-users' as MenuItemId,
    title: 'Manage Users',
    href: '/dashboard/admin/manage-users',
    icon: ShieldAlert,
    requiresSuperAdmin: true,
  },
  {
    id: 'subscriptions' as MenuItemId,
    title: 'Subscriptions',
    href: '/dashboard/admin/subscriptions',
    icon: CreditCard,
    requiresSuperAdmin: true,
  },
  {
    id: 'data-monetization' as MenuItemId,
    title: 'Data Monetization',
    href: '/dashboard/payments/data-monetization',
    icon: Database,
  },
  {
    id: 'widgets' as MenuItemId,
    title: 'Widgets',
    href: '/dashboard/ecommerce/widgets',
    icon: Code,
  },
];

interface SidebarNavProps {
  isExpanded: boolean;
}

export function SidebarNav({ isExpanded }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const t = useTranslations('navigation');
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  // Helper function to translate menu item titles
  const translateMenuItem = (itemId: string, fallbackTitle: string): string => {
    const translationMap: Record<string, string> = {
      'dashboard': 'dashboard',
      'ai-brain': 'aiBrain',
      'business-ai': 'businessAI',
      'ai-employees': 'aiEmployees',
      'docpen': 'aiDocpen',
      'onboarding': 'onboardingWizard',
      'leads': 'leads',
      'contacts': 'contacts',
      'pipeline': 'pipeline',
      'messages': 'messages',
      'soshogle': 'soshogleMultiChannel',
      'voice-agent': 'voiceAgent',
      'calendar': 'appointments',
      'reservations': 'reservations',
      'clubos-admin': 'clubosAdmin',
      'clubos-teams': 'teamsLeagues',
      'delivery': 'delivery',
      'inventory': 'inventory',
      'general-inventory': 'inventory',
      'payments': 'payments',
      'ecommerce': 'ecommerce',
      'ai-automations': 'aiAutomations',
      'workflows': 'workflows',
      'reviews': 'reviews',
      'referrals': 'referrals',
      'real-estate-dashboard': 'realEstateHub',
      'fsbo-leads': 'fsboLeads',
      'cma-tools': 'cmaTools',
      'market-insights': 'marketInsights',
      'seller-net-sheet': 'sellerNetSheet',
      'real-estate-analytics': 'realEstateAnalytics',
      'dental-management': 'dentalManagement',
      'dental-clinical': 'clinicalDashboard',
      'dental-admin': 'administrativeDashboard',
      'websites': 'websites',
      'voice-agents': 'voiceAgents',
      'voice-agent-preview': 'testVoiceAgent',
      'voice-ai-notifications': 'callNotifications',
      'team': 'team',
      'settings': 'settings',
      'tasks': 'tasks',
      'analytics': 'analytics',
      'permissions': 'permissions',
      'billing': 'billing',
      'booking-settings': 'bookingSettings',
      'widgets': 'embedWidget',
      'manage-users': 'manageUsers',
      'subscriptions': 'subscriptions',
      'data-monetization': 'dataMonetization',
      'parent-dashboard': 'myDashboard',
      'parent-family': 'myFamily',
      'parent-schedules': 'mySchedules',
      'parent-payments': 'myPayments',
    };

    const translationKey = translationMap[itemId];
    if (translationKey) {
      try {
        const translated = t(translationKey);
        // If translation returns the key with namespace prefix, it means translation doesn't exist
        // Use fallback title instead
        if (translated.startsWith('navigation.')) {
          return fallbackTitle;
        }
        return translated;
      } catch {
        return fallbackTitle;
      }
    }
    return fallbackTitle;
  };
  
  // Admin session state
  const [hasAdminSession, setHasAdminSession] = useState(false);
  const [showAdminAuthDialog, setShowAdminAuthDialog] = useState(false);
  const [pendingAdminRoute, setPendingAdminRoute] = useState<string | null>(null);

  // Get user industry directly from session (already populated in auth.ts)
  const userIndustry = (session?.user?.industry as Industry) || null;

  // Debug: Log industry for troubleshooting
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('🔍 Sidebar - User industry check:', {
        userId: session.user.id,
        industry: session.user.industry,
        email: session.user.email,
        hasIndustry: !!session.user.industry,
      });
    }
  }, [status, session]);

  // Refresh session if industry is missing but user is authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !userIndustry) {
      console.log('⚠️ Industry missing from session, attempting refresh...');
      update().then(() => {
        console.log('✅ Session refreshed');
      }).catch((err) => {
        console.error('❌ Failed to refresh session:', err);
      });
    }
  }, [status, session, userIndustry, update]);

  // Check admin session validity on mount
  useEffect(() => {
    const checkAdminSession = () => {
      const sessionToken = localStorage.getItem('adminSessionToken');
      const sessionExpiry = localStorage.getItem('adminSessionExpiry');
      
      if (sessionToken && sessionExpiry) {
        const expiry = parseInt(sessionExpiry, 10);
        if (expiry > Date.now()) {
          setHasAdminSession(true);
          return;
        }
      }
      
      setHasAdminSession(false);
      // Clear expired session
      localStorage.removeItem('adminSessionToken');
      localStorage.removeItem('adminSessionExpiry');
    };

    checkAdminSession();
    
    // Check session validity every minute
    const interval = setInterval(checkAdminSession, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch parent role from API ONCE
  useEffect(() => {
    const fetchParentRole = async () => {
      try {
        // Check if user is a parent (has a household)
        const roleResponse = await fetch('/api/clubos/parent/check-role');
        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          setIsParent(roleData.isParent || false);
        }
      } catch (error) {
        console.error('Error fetching parent role:', error);
      } finally {
        setIsLoadingRole(false);
      }
    };

    // Only fetch if we have a session and haven't loaded yet
    if (session?.user && isLoadingRole) {
      fetchParentRole();
    } else if (!session?.user) {
      setIsLoadingRole(false);
    }
  }, [session?.user?.id, isLoadingRole]); // Only depend on user ID to prevent repeated calls

  const handleLogout = async () => {
    console.log('🚪 Logout initiated');
    
    // First, end any active impersonation sessions on the server
    try {
      const sessionToken = localStorage.getItem('impersonationToken');
      
      if (sessionToken) {
        console.log('📡 Ending impersonation session before logout');
        await fetch(`/api/platform-admin/impersonate?sessionToken=${sessionToken}`, {
          method: 'DELETE',
        });
      }
      
      // Also call the end-all endpoint to be extra sure
      console.log('📡 Calling end-all to terminate any active sessions');
      await fetch('/api/platform-admin/impersonate/end-all', {
        method: 'POST',
      });
    } catch (error) {
      console.error('⚠️ Error ending impersonation during logout:', error);
      // Continue with logout even if this fails
    }
    
    // Clear any impersonation data from localStorage
    console.log('🧹 Clearing localStorage');
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('impersonatedUserId');
    localStorage.removeItem('impersonatedUserName');
    
    console.log('👋 Signing out');
    // Sign out and redirect to signin page
    await signOut({ callbackUrl: '/auth/signin', redirect: true });
  };

  // Handle admin link clicks - check for valid session or show auth dialog
  const handleAdminLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    
    if (hasAdminSession) {
      // Session is valid, navigate normally
      router.push(href);
    } else {
      // Need authentication, show dialog
      setPendingAdminRoute(href);
      setShowAdminAuthDialog(true);
    }
  };

  // Handle successful admin authentication
  const handleAdminAuthSuccess = (sessionToken: string) => {
    setHasAdminSession(true);
    setShowAdminAuthDialog(false);
    
    // Navigate to the pending route if any
    if (pendingAdminRoute) {
      router.push(pendingAdminRoute);
      setPendingAdminRoute(null);
    }
  };

  // Determine which menu items to show based on role
  const visibleMainItems = isParent
    ? parentItems // Show parent items if user has a household
    : merchantItems
        .filter((item) => isMenuItemVisible(item.id, userIndustry)) // Filter by industry
        .filter((item) => {
          // Hide onboarding menu item if user has completed onboarding
          if (item.id === 'onboarding' && session?.user?.onboardingCompleted) {
            return false;
          }
          return true;
        }); // Show merchant items otherwise

  const visibleAdminItems = isParent
    ? [] // Parents don't see admin section
    : adminItems.filter((item) => {
        // Check if item requires super admin access
        // Allow access if user is SUPER_ADMIN directly OR if they're impersonating (superAdminId present)
        const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN' || 
          (session?.user?.isImpersonating && session?.user?.superAdminId);
        if ((item as any).requiresSuperAdmin && !isSuperAdmin) {
          return false;
        }
        return isMenuItemVisible(item.id, userIndustry);
      });

  const isAdminSectionActive = visibleAdminItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  // Helper function to check if a link is active
  const isLinkActive = (href: string) => {
    // Exact match for dashboard
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    
    // For onboarding, exact match only
    if (href === '/onboarding') {
      return pathname === '/onboarding';
    }
    
    // For parent routes that have child pages (like /dashboard/real-estate), 
    // only highlight if it's an EXACT match to prevent double highlighting
    const parentRoutesWithChildren = [
      '/dashboard/real-estate',
      '/dashboard/clubos',
      '/dashboard/clubos/parent',
      '/dashboard/campaigns',
      '/dashboard/ecommerce',
      '/dashboard/payments',
    ];
    
    if (parentRoutesWithChildren.includes(href)) {
      return pathname === href;
    }
    
    // Exact match first
    if (pathname === href) return true;
    
    // For child routes: only match if pathname starts with href followed by /
    // This prevents false matches (e.g., /dashboard/payments won't match /dashboard/payment-history)
    if (pathname.startsWith(href + '/')) return true;
    
    return false;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 py-2 min-h-0">
        <div className="space-y-1 pb-32">
          {/* Extra padding at bottom to ensure admin items are fully visible above the sticky footer */}
          {/* Main Menu Items (Parent or Merchant based on role) */}
          {visibleMainItems.map((item) => {
            const Icon = item.icon;
            const isActive = isLinkActive(item.href);
            const translatedTitle = translateMenuItem(item.id, item.title);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200',
                  isActive
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
                title={!isExpanded ? translatedTitle : undefined}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                {isExpanded && <span className="whitespace-nowrap">{translatedTitle}</span>}
              </Link>
            );
          })}

          {/* Admin Section */}
          <div>
            <button
              onClick={() => setAdminExpanded(!adminExpanded)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 w-full',
                isAdminSectionActive
                  ? 'bg-purple-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
              title={!isExpanded ? translateMenuItem('admin', 'Admin') : undefined}
            >
              <Settings className="h-[18px] w-[18px] flex-shrink-0" />
              {isExpanded && (
                <>
                  <span className="flex-1 text-left whitespace-nowrap">{translateMenuItem('admin', 'Admin')}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      adminExpanded && 'rotate-180'
                    )}
                  />
                </>
              )}
            </button>

            {/* Admin Dropdown Items - only show when expanded */}
            {isExpanded && adminExpanded && (
              <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-700 pl-2">
                {visibleAdminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isLinkActive(item.href);
                  const requiresSuperAdmin = (item as any).requiresSuperAdmin;
                  const requiresAdminAuth = (item as any).requiresAdmin;
                  
                  // SUPER_ADMIN pages don't require admin re-authentication (role check is at page level)
                  // Regular admin pages require admin re-authentication
                  const needsAdminDialog = requiresAdminAuth && !requiresSuperAdmin;
                  // Check if user is SUPER_ADMIN either directly or via impersonation
                  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN' || 
                    (session?.user?.isImpersonating && session?.user?.superAdminId);

                  return (
                    <button
                      key={item.href}
                      onClick={(e) => {
                        // Super admin pages: navigate directly (page guard handles role check)
                        if (requiresSuperAdmin && isSuperAdmin) {
                          e.preventDefault();
                          router.push(item.href);
                        }
                        // Regular admin pages: check for admin session
                        else if (needsAdminDialog) {
                          handleAdminLinkClick(e, item.href);
                        }
                        // Non-admin pages: navigate directly
                        else {
                          e.preventDefault();
                          router.push(item.href);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2 px-2 py-2 text-sm transition-all duration-200 rounded w-full text-left',
                        isActive
                          ? 'bg-purple-600 text-white font-medium'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap text-xs flex-1">{translateMenuItem(item.id, item.title)}</span>
                      {needsAdminDialog && !hasAdminSession && (
                        <Lock className="h-3 w-3 text-yellow-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* User Profile / Logout Section - Fixed at bottom, always visible when authenticated */}
      <div className="border-t border-gray-800 py-2 flex-shrink-0 bg-gray-900 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
        {status === 'authenticated' && (
          <div className="space-y-1">
            {/* User Profile */}
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200',
                'text-gray-300'
              )}
              title={!isExpanded ? session?.user?.name || session?.user?.email || 'User' : undefined}
            >
              <div className="w-[18px] h-[18px] rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <User className="h-[10px] w-[10px] text-white" />
              </div>
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {session?.user?.email || ''}
                  </p>
                </div>
              )}
            </div>

            {/* Logout Button - Always visible when authenticated */}
            <button
              onClick={handleLogout}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 w-full',
                'text-gray-300 hover:bg-red-900/50 hover:text-white'
              )}
              title={!isExpanded ? 'Logout' : undefined}
            >
              <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
              {isExpanded && <span className="whitespace-nowrap">Logout</span>}
            </button>
          </div>
        )}
      </div>

      {/* Admin Authentication Dialog */}
      <AdminAuthDialog
        open={showAdminAuthDialog}
        onOpenChange={setShowAdminAuthDialog}
        onSuccess={handleAdminAuthSuccess}
      />
    </div>
  );
}
