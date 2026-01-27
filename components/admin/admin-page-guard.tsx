
'use client';

import { useAdminAccess } from '@/hooks/use-admin-access';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ReactNode } from 'react';

interface AdminPageGuardProps {
  children: ReactNode;
}

/**
 * Wrapper component to protect admin pages
 * Shows loading state while checking authentication
 */
export default function AdminPageGuard({ children }: AdminPageGuardProps) {
  const { isAdminAuthenticated, isChecking } = useAdminAccess();

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
