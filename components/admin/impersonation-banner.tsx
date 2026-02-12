'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Shield, X, AlertTriangle } from 'lucide-react';

export function ImpersonationBanner() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  // Automatically check and redirect if impersonation has expired
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isImpersonating) {
      // Set up interval to periodically refresh session to check impersonation status
      const interval = setInterval(async () => {
        const updatedSession = await update();
        
        // If session no longer shows impersonation, it has expired
        if (!updatedSession?.user?.isImpersonating) {
          toast.info('Impersonation session expired (15 min timeout)');
          // Clear any localStorage remnants
          localStorage.removeItem('impersonationToken');
          localStorage.removeItem('impersonatedUserId');
          localStorage.removeItem('impersonatedUserName');
          window.location.href = '/platform-admin';
        }
      }, 60000); // Check every 60 seconds

      return () => clearInterval(interval);
    }
  }, [status, session, update]);

  const endImpersonation = async () => {
    try {
      console.log('🚪 EXIT IMPERSONATION BUTTON CLICKED');
      console.log('📊 Current session state:', {
        userId: session?.user?.id,
        userName: session?.user?.name,
        isImpersonating: session?.user?.isImpersonating,
        superAdminId: session?.user?.superAdminId,
      });
      
      // Get the impersonation session token from localStorage (if it exists)
      const sessionToken = localStorage.getItem('impersonationToken');
      
      console.log('🔍 Session token from localStorage:', sessionToken ? `Found: ${sessionToken.substring(0, 20)}...` : 'Not found');
      
      if (sessionToken) {
        // End the impersonation session on the server
        console.log('📡 Calling DELETE /api/platform-admin/impersonate with token');
        const response = await fetch(`/api/platform-admin/impersonate?sessionToken=${sessionToken}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 DELETE response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to end impersonation session:', errorText);
          toast.error('Failed to end session. Trying to end all sessions...');
          
          // Try the end-all endpoint as fallback
          const fallbackResponse = await fetch('/api/platform-admin/impersonate/end-all', {
            method: 'POST',
          });
          
          if (!fallbackResponse.ok) {
            console.error('❌ Fallback also failed');
            toast.error('Could not end impersonation. Please contact support.');
            return;
          }
          
          console.log('✅ Fallback succeeded - all sessions ended');
        } else {
          console.log('✅ Successfully ended impersonation session on server');
        }
      } else {
        console.warn('⚠️ No session token found - ending all active sessions for this super admin');
        // If no session token, try to end all active sessions for this super admin
        const response = await fetch('/api/platform-admin/impersonate/end-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 end-all response status:', response.status);
        
        if (!response.ok) {
          console.error('❌ Failed to end all impersonation sessions');
          toast.error('Failed to end impersonation. Please try again.');
          return;
        } else {
          console.log('✅ Ended all active impersonation sessions');
        }
      }

      // Clear localStorage
      console.log('🧹 Clearing localStorage');
      localStorage.removeItem('impersonationToken');
      localStorage.removeItem('impersonatedUserId');
      localStorage.removeItem('impersonatedUserName');

      console.log('🔄 Triggering session update with NextAuth');
      // Force NextAuth to refresh the JWT token (which will check the database and remove impersonation flags)
      await update();

      toast.success('Exiting impersonation mode...');

      console.log('🔀 Redirecting to /platform-admin with full page reload');
      // Use window.location.href for a full page reload to ensure JWT callback runs with fresh database state
      window.location.href = '/platform-admin';
    } catch (error: any) {
      console.error('❌ Error ending impersonation:', error);
      toast.error('Failed to end impersonation session: ' + error.message);
    }
  };

  // Only show banner if session indicates impersonation is active
  if (status !== 'authenticated' || !session?.user?.isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] shadow-2xl">
      <Alert className="rounded-none border-0 border-b-4 border-yellow-500 bg-gradient-to-r from-yellow-600 to-orange-600 backdrop-blur-sm py-4">
        <div className="container mx-auto flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-900/50 px-3 py-1 rounded-lg border border-yellow-400/30">
              <Shield className="h-5 w-5 text-yellow-200 animate-pulse" />
              <span className="text-xs font-semibold text-yellow-100 uppercase tracking-wider">
                Admin View Mode
              </span>
            </div>
            <AlertDescription className="text-white font-medium text-base">
              <span className="flex items-center gap-2">
                <span className="text-yellow-100">
                  Viewing as <strong className="text-white font-bold">{session.user.name}</strong>
                </span>
                <span className="text-yellow-200/70 text-sm">
                  (Admin: {session.user.superAdminName})
                </span>
              </span>
            </AlertDescription>
          </div>
          <Button
            onClick={endImpersonation}
            variant="outline"
            size="lg"
            className="bg-white/90 border-2 border-white text-orange-700 hover:bg-white hover:border-white hover:text-orange-800 font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <X className="h-5 w-5 mr-2 font-bold" />
            EXIT & RETURN TO ADMIN
          </Button>
        </div>
      </Alert>
    </div>
  );
}
