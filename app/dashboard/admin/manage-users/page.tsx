
/**
 * Admin User Management Page
 * Central hub for managing all business accounts
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ManageUsersList from '@/components/admin/manage-users-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function ManageUsersPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is SUPER_ADMIN
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      toast.error('Unauthorized - Admin access required');
      router.push('/dashboard');
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return (
      <Alert variant="destructive" className="m-8">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Unauthorized - You must be a Super Admin to access this page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Business Accounts</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all business accounts in the system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Accounts</CardTitle>
          <CardDescription>
            Search, filter, and manage all registered businesses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManageUsersList />
        </CardContent>
      </Card>
    </div>
  );
}
