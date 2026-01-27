'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Search, UserCog, Shield, Users, LogIn, BarChart3, LogOut, Clock, UserPlus, Edit } from 'lucide-react';
import UsageAnalyticsDashboard from '@/components/admin/usage-analytics-dashboard';
import CreateBusinessOwnerDialog from '@/components/admin/create-business-owner-dialog';
import EditUserDialog from '@/components/admin/edit-user-dialog';

const ADMIN_SESSION_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  industry: string | null;
  phone: string | null;
  businessCategory: string | null;
  businessDescription: string | null;
  createdAt: string;
  onboardingCompleted: boolean;
  accountStatus: string;
  _count: {
    leads: number;
    deals: number;
    voiceAgents: number;
    appointments: number;
  };
}

export default function PlatformAdminPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [remainingTime, setRemainingTime] = useState<number>(ADMIN_SESSION_DURATION / 1000); // in seconds
  const [showCreateBusinessOwnerDialog, setShowCreateBusinessOwnerDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 15-minute auto-logout mechanism
  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'SUPER_ADMIN') {
      return;
    }

    // Initialize session start time
    const sessionStartKey = 'superAdminSessionStart';
    const existingStartTime = localStorage.getItem(sessionStartKey);
    
    if (!existingStartTime) {
      localStorage.setItem(sessionStartKey, Date.now().toString());
    }

    const checkSessionTimeout = () => {
      const startTime = parseInt(localStorage.getItem(sessionStartKey) || '0');
      const elapsed = Date.now() - startTime;
      const remaining = ADMIN_SESSION_DURATION - elapsed;

      if (remaining <= 0) {
        // Session expired - auto logout
        localStorage.removeItem(sessionStartKey);
        toast.info('Admin session expired (15 min timeout). Please sign in again.');
        signOut({ callbackUrl: '/auth/signin' });
      } else {
        // Update remaining time display
        setRemainingTime(Math.ceil(remaining / 1000));
      }
    };

    // Check immediately
    checkSessionTimeout();

    // Check every minute
    const intervalId = setInterval(checkSessionTimeout, 60 * 1000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user && session.user.role !== 'SUPER_ADMIN') {
      toast.error('Forbidden: SUPER_ADMIN access required');
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, session, router, page, roleFilter, industryFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (roleFilter && roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      if (industryFilter && industryFilter !== 'all') {
        params.append('industry', industryFilter);
      }

      const response = await fetch(`/api/platform-admin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImpersonate = async (targetUserId: string, userName: string) => {
    setIsImpersonating(targetUserId);
    try {
      console.log('🔐 Starting impersonation for user:', userName, targetUserId);
      
      const response = await fetch('/api/platform-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to impersonate user');
      }

      const data = await response.json();
      console.log('✅ Impersonation session created:', data);

      // Store impersonation token in localStorage
      localStorage.setItem('impersonationToken', data.sessionToken);
      localStorage.setItem('impersonatedUserId', targetUserId);
      localStorage.setItem('impersonatedUserName', userName);
      console.log('💾 Stored impersonation data in localStorage');

      toast.success(`Now impersonating ${userName}`, {
        duration: 2000,
      });

      // Wait a moment to show the toast
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to user's dashboard using window.location to force a full page reload
      // This ensures the session is completely refreshed and JWT callback will detect impersonation
      console.log('🚀 Redirecting to /dashboard for impersonation...');
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('❌ Error impersonating user:', error);
      toast.error(error.message || 'Failed to impersonate user');
      // Clean up localStorage on error
      localStorage.removeItem('impersonationToken');
      localStorage.removeItem('impersonatedUserId');
      localStorage.removeItem('impersonatedUserName');
    } finally {
      setIsImpersonating(null);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditUserDialog(true);
  };

  const handleEditSuccess = () => {
    fetchUsers(); // Refresh the user list
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    try {
      setApprovingUser(userId);

      const response = await fetch('/api/platform-admin/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve user');
      }

      toast.success(`User ${userName} has been approved!`);
      
      // Refresh the user list
      fetchUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast.error(error.message || 'Failed to approve user');
    } finally {
      setApprovingUser(null);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Image 
                src="/soshogle-logo.png" 
                alt="Soshogle Logo" 
                width={48} 
                height={48}
                className="rounded-lg"
              />
              <h1 className="text-3xl font-bold gradient-text">Platform Administration</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`${remainingTime < 300 ? 'bg-yellow-600 border-yellow-700' : 'bg-blue-600 border-blue-700'} text-white`}
              >
                <Clock className="h-3 w-3 mr-1" />
                Session: {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')} remaining
              </Badge>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem('superAdminSessionStart');
                  signOut({ callbackUrl: '/auth/signin' });
                  toast.success('Logged out successfully');
                }}
                className="bg-red-600 hover:bg-red-700 text-white border-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <p className="text-black font-semibold">Manage all users and monitor platform usage • Auto-logout after 15 minutes</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Usage Analytics
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Filters */}
            <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Search & Filters</CardTitle>
            <CardDescription className="text-gray-400">Find and filter users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by name, email, or business..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="BUSINESS_OWNER">Business Owner</SelectItem>
                    <SelectItem value="PARENT">Parent</SelectItem>
                    <SelectItem value="AGENCY_ADMIN">Agency Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Filter by industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                    <SelectItem value="SPORTS_CLUB">Sports Club</SelectItem>
                    <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
                    <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSearch}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                onClick={() => setShowCreateBusinessOwnerDialog(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Business Owner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {user.name || 'Unnamed User'}
                          </h3>
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/50">
                            {user.role}
                          </Badge>
                          {user.accountStatus === 'PENDING_APPROVAL' && (
                            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/50 animate-pulse">
                              Pending Approval
                            </Badge>
                          )}
                          {user.accountStatus === 'ACTIVE' && (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/50">
                              Active
                            </Badge>
                          )}
                          {user.industry && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/50">
                              {user.industry}
                            </Badge>
                          )}
                          {!user.onboardingCompleted && (
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/50">
                              Incomplete Onboarding
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{user.email}</p>
                        {user.businessCategory && (
                          <p className="text-gray-500 text-sm mb-2">{user.businessCategory}</p>
                        )}
                        <div className="flex gap-4 text-sm text-gray-400">
                          <span>Leads: {user._count.leads}</span>
                          <span>Deals: {user._count.deals}</span>
                          <span>Voice Agents: {user._count.voiceAgents}</span>
                          <span>Appointments: {user._count.appointments}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleEditUser(user)}
                          variant="outline"
                          size="sm"
                          className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        {user.accountStatus === 'PENDING_APPROVAL' && (
                          <Button
                            onClick={() => handleApproveUser(user.id, user.name || user.email)}
                            disabled={approvingUser === user.id}
                            size="sm"
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          >
                            {approvingUser === user.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Approve User
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          onClick={() => handleImpersonate(user.id, user.name || user.email)}
                          disabled={isImpersonating === user.id}
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {isImpersonating === user.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Impersonating...
                            </>
                          ) : (
                            <>
                              <LogIn className="h-4 w-4 mr-2" />
                              Login as User
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-white"
                >
                  Previous
                </Button>
                <span className="text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-white"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Usage Analytics Tab */}
          <TabsContent value="usage">
            <UsageAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Business Owner Dialog */}
      <CreateBusinessOwnerDialog
        open={showCreateBusinessOwnerDialog}
        onOpenChange={setShowCreateBusinessOwnerDialog}
        onSuccess={() => {
          setShowCreateBusinessOwnerDialog(false);
          fetchUsers(); // Refresh the user list
        }}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={showEditUserDialog}
        onOpenChange={setShowEditUserDialog}
        user={selectedUser}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
