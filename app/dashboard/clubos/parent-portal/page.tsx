
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Copy, 
  RefreshCw, 
  Users, 
  Check, 
  X,  
  Clock, 
  Link2, 
  CheckCircle2,
  AlertCircle,
  Ban,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Household {
  id: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  status: string;
  clubCode: string | null;
  createdAt: string;
  verifiedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
  };
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }>;
  _count: {
    members: number;
    registrations: number;
  };
}

interface Stats {
  pending: number;
  active: number;
  suspended: number;
  total: number;
}

export default function ParentPortalPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [clubCode, setClubCode] = useState('');
  const [signupUrl, setSignupUrl] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, active: 0, suspended: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');

  useEffect(() => {
    fetchClubCode();
    fetchHouseholds();
  }, [statusFilter]);

  const fetchClubCode = async () => {
    try {
      const response = await fetch('/api/clubos/club-code');
      const data = await response.json();
      setClubCode(data.clubCode || '');
      setSignupUrl(data.signupUrl || '');
      setPendingCount(data.pendingParentsCount || 0);
    } catch (error) {
      console.error('Error fetching club code:', error);
      toast.error('Failed to load club code');
    }
  };

  const fetchHouseholds = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clubos/parent-approvals?status=${statusFilter}`);
      const data = await response.json();
      setHouseholds(data.households || []);
      setStats(data.stats || { pending: 0, active: 0, suspended: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching households:', error);
      toast.error('Failed to load parent registrations');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewCode = async () => {
    setIsCodeLoading(true);
    try {
      const response = await fetch('/api/clubos/club-code', { method: 'POST' });
      const data = await response.json();
      setClubCode(data.clubCode);
      setSignupUrl(data.signupUrl);
      toast.success('New club code generated');
    } catch (error) {
      console.error('Error generating club code:', error);
      toast.error('Failed to generate new code');
    } finally {
      setIsCodeLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleApproval = async (householdId: string, action: string) => {
    try {
      const response = await fetch(`/api/clubos/parent-approvals/${householdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast.success(data.message);
      fetchHouseholds();
      fetchClubCode(); // Update pending count
    } catch (error: any) {
      console.error('Error updating household:', error);
      toast.error(error.message || 'Failed to update household');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'ACTIVE':
        return <Badge className="bg-green-500/20 text-green-300 border border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-red-500/20 text-red-300 border border-red-500/30"><Ban className="h-3 w-3 mr-1" />Suspended</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-500/20 text-gray-300 border border-gray-500/30"><X className="h-3 w-3 mr-1" />Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Parent Portal Management</h1>
        <p className="text-gray-400">View and manage parent accounts. All parents have instant access upon signup.</p>
      </div>

      {/* Club Code Section */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Link2 className="h-5 w-5" />
            Parent Signup Link
          </CardTitle>
          <CardDescription className="text-gray-600">Share this code or link with parents. They'll have instant access - no approval needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-gray-700">Club Code</Label>
              <div className="flex gap-2">
                <Input
                  value={clubCode}
                  readOnly
                  className="bg-gradient-to-r from-purple-600 to-pink-600 border-transparent text-white font-mono text-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(clubCode, 'Club code')}
                  className="bg-gray-100 border-gray-300 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4 text-gray-700" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Signup URL</Label>
              <div className="flex gap-2">
                <Input
                  value={signupUrl}
                  readOnly
                  className="bg-gradient-to-r from-purple-600 to-pink-600 border-transparent text-white text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(signupUrl, 'Signup URL')}
                  className="bg-gray-100 border-gray-300 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4 text-gray-700" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Alert className="bg-purple-500/10 border-purple-500/30">
              <AlertCircle className="h-4 w-4 text-purple-400" />
              <AlertDescription className="text-purple-600">
                {pendingCount} parent{pendingCount !== 1 ? 's' : ''} waiting for approval
              </AlertDescription>
            </Alert>
            
            <Button
              variant="outline"
              onClick={generateNewCode}
              disabled={isCodeLoading}
              className="bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-700"
            >
              {isCodeLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => setStatusFilter('ALL')}>
          <CardHeader className="pb-2">
            <CardDescription>Total Families</CardDescription>
            <CardTitle className="text-3xl gradient-text">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-colors cursor-pointer" onClick={() => setStatusFilter('ACTIVE')}>
          <CardHeader className="pb-2">
            <CardDescription>Active Accounts (Instant Access)</CardDescription>
            <CardTitle className="text-3xl text-green-400">{stats.active}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gray-900 border-gray-800 hover:border-green-500/50 transition-colors cursor-pointer" onClick={() => setStatusFilter('ACTIVE')}>
          <CardHeader className="pb-2">
            <CardDescription>Active Families</CardDescription>
            <CardTitle className="text-3xl text-green-400">{stats.active}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gray-900 border-gray-800 hover:border-red-500/50 transition-colors cursor-pointer" onClick={() => setStatusFilter('SUSPENDED')}>
          <CardHeader className="pb-2">
            <CardDescription>Suspended</CardDescription>
            <CardTitle className="text-3xl text-red-400">{stats.suspended}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Households List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Parent Accounts</CardTitle>
            <CardDescription>All parents have instant access. You can suspend accounts if needed.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHouseholds} className="bg-gray-800 border-gray-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="ALL">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="PENDING">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="ACTIVE">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="SUSPENDED">Suspended ({stats.suspended})</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="space-y-4 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : households.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-600">No {statusFilter.toLowerCase()} families found</p>
                </div>
              ) : (
                households.map((household) => (
                  <div
                    key={household.id}
                    className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">{household.primaryContactName}</h3>
                          {getStatusBadge(household.status)}
                        </div>
                        
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>Email: {household.primaryContactEmail}</p>
                          <p>Phone: {household.primaryContactPhone}</p>
                          <p>Signed up: {format(new Date(household.createdAt), 'MMM d, yyyy h:mm a')}</p>
                          {household.verifiedAt && (
                            <p>Approved: {format(new Date(household.verifiedAt), 'MMM d, yyyy h:mm a')}</p>
                          )}
                          <p>{household._count.members} family member{household._count.members !== 1 ? 's' : ''}, {household._count.registrations} registration{household._count.registrations !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {household.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproval(household.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproval(household.id, 'reject')}
                              className="border-red-500 text-red-400 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {household.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproval(household.id, 'suspend')}
                            className="border-red-500 text-red-400 hover:bg-red-500/10"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        )}
                        {household.status === 'SUSPENDED' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproval(household.id, 'activate')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
