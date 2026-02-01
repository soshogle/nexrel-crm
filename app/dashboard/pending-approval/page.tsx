'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Mail, LogOut, CheckCircle2 } from 'lucide-react';

export default function PendingApprovalPage() {
  const { data: session, status, update } = useSession() || {};
  const router = useRouter();

  // Poll for account status changes every 30 seconds
  useEffect(() => {
    if (status !== 'authenticated') return;

    const interval = setInterval(async () => {
      // Trigger session update to check if status changed
      const updated = await update();
      
      // @ts-ignore - check updated session
      if (updated?.user?.accountStatus === 'ACTIVE') {
        // Account was approved! Redirect to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [status, update, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const handleCheckStatus = async () => {
    const updated = await update();
    // @ts-ignore
    if (updated?.user?.accountStatus === 'ACTIVE') {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <CardTitle className="text-3xl font-bold">Account Pending Approval</CardTitle>
          <CardDescription className="text-lg">
            Welcome, {session?.user?.name || 'there'}!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-yellow-50 border-yellow-200">
            <Clock className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Your account is pending admin approval.</strong>
              <br />
              You'll have full access to all CRM features once an administrator approves your account.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-600" />
                What happens next?
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs mt-0.5">
                    1
                  </div>
                  <p>An administrator will review your account registration</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs mt-0.5">
                    2
                  </div>
                  <p>Once approved, you'll automatically gain access to all features</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs mt-0.5">
                    3
                  </div>
                  <p>You can refresh this page or sign in again to check your approval status</p>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Account Information
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Name:</strong> {session?.user?.name}</p>
                <p><strong>Email:</strong> {session?.user?.email}</p>
                <p><strong>Status:</strong> <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-md font-medium">Pending Approval</span></p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleCheckStatus}
              className="flex-1"
              variant="outline"
            >
              Check Status
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="flex-1"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            This page will automatically refresh every 30 seconds to check your approval status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
