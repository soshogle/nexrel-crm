'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

/**
 * Hook to protect super admin pages
 * Checks if user has SUPER_ADMIN role and redirects if not
 */
export function useSuperAdminAccess() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSuperAdminAccess = async () => {
      // Wait for session to load
      if (status === 'loading') {
        return;
      }

      // Must be logged in first
      if (status === 'unauthenticated' || !session?.user) {
        toast.error('You must be logged in to access this page.');
        router.push('/auth/signin');
        return;
      }

      // Check if user has SUPER_ADMIN role OR is a super admin impersonating another user
      const isDirectSuperAdmin = session.user.role === 'SUPER_ADMIN';
      const isImpersonatingSuperAdmin = session.user.isImpersonating && session.user.superAdminId;

      if (!isDirectSuperAdmin && !isImpersonatingSuperAdmin) {
        toast.error('Access denied. This page is only accessible to Super Admins.');
        setIsSuperAdmin(false);
        setIsChecking(false);
        router.push('/dashboard');
        return;
      }

      // User is a super admin (either directly or impersonating)
      console.log('✅ Super admin access granted:', {
        direct: isDirectSuperAdmin,
        impersonating: isImpersonatingSuperAdmin,
        userId: session.user.id,
        superAdminId: session.user.superAdminId
      });
      setIsSuperAdmin(true);
      setIsChecking(false);
    };

    checkSuperAdminAccess();
  }, [status, session, router]);

  return { isSuperAdmin, isChecking };
}
