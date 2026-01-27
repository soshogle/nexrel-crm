
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

/**
 * Hook to protect admin pages
 * Checks for valid admin session and redirects to dashboard if not authenticated
 */
export function useAdminAccess() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminSession = async () => {
      // Wait for session to load
      if (status === 'loading') {
        return;
      }

      // Must be logged in first
      if (status === 'unauthenticated' || !session?.user) {
        router.push('/auth/signin');
        return;
      }

      // Check localStorage for admin session
      const sessionToken = localStorage.getItem('adminSessionToken');
      const sessionExpiry = localStorage.getItem('adminSessionExpiry');

      if (!sessionToken || !sessionExpiry) {
        setIsAdminAuthenticated(false);
        setIsChecking(false);
        router.push('/dashboard');
        return;
      }

      const expiry = parseInt(sessionExpiry, 10);
      if (expiry <= Date.now()) {
        // Session expired
        localStorage.removeItem('adminSessionToken');
        localStorage.removeItem('adminSessionExpiry');
        setIsAdminAuthenticated(false);
        setIsChecking(false);
        toast.info('Admin session expired (15 min timeout). Please re-authenticate.');
        router.push('/dashboard');
        return;
      }

      // Verify with server
      try {
        const response = await fetch('/api/admin/session');
        if (response.ok) {
          const data = await response.json();
          if (data.isValid) {
            setIsAdminAuthenticated(true);
          } else {
            // Server says invalid, clear local storage
            localStorage.removeItem('adminSessionToken');
            localStorage.removeItem('adminSessionExpiry');
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error verifying admin session:', error);
        router.push('/dashboard');
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminSession();
    
    // Set up interval to check session every minute (only after initial check completes)
    let interval: NodeJS.Timeout;
    if (status !== 'loading') {
      interval = setInterval(() => {
        const sessionToken = localStorage.getItem('adminSessionToken');
        const sessionExpiry = localStorage.getItem('adminSessionExpiry');
        
        if (!sessionToken || !sessionExpiry) {
          setIsAdminAuthenticated(false);
          router.push('/dashboard');
          return;
        }
        
        const expiry = parseInt(sessionExpiry, 10);
        if (expiry <= Date.now()) {
          // Session expired - clear and redirect
          localStorage.removeItem('adminSessionToken');
          localStorage.removeItem('adminSessionExpiry');
          setIsAdminAuthenticated(false);
          toast.info('Admin session expired (15 min timeout). Please re-authenticate.');
          router.push('/dashboard');
        }
      }, 60000); // Check every 60 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, session, router]);

  return { isAdminAuthenticated, isChecking };
}
