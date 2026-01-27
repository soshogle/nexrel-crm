'use client';

import { useSuperAdminAccess } from '@/hooks/use-super-admin-access';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ReactNode } from 'react';

interface SuperAdminPageGuardProps {
  children: ReactNode;
}

/**
 * Wrapper component to protect super admin pages
 * Shows loading state while checking authentication
 * Only allows access to users with SUPER_ADMIN role
 */
export default function SuperAdminPageGuard({ children }: SuperAdminPageGuardProps) {
  const { isSuperAdmin, isChecking } = useSuperAdminAccess();

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Verifying super admin access...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Access Denied. Redirecting...</p>
          <p className="text-xs text-gray-500 mt-2">This page is only accessible to Super Admins</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
