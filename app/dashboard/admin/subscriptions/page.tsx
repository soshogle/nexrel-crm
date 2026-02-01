
'use client';

export const dynamic = 'force-dynamic';

/**
 * Admin Subscriptions Dashboard
 * Manage all user subscriptions
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SubscriptionManager from '@/components/admin/subscription-manager';
import { toast } from 'sonner';
import { Loader2, Search, DollarSign, Users, TrendingUp } from 'lucide-react';

type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

interface User {
  id: string;
  email: string;
  name?: string;
  businessName?: string;
  role: string;
  createdAt: string;
  subscription?: {
    id: string;
    userId: string;
    tier: SubscriptionTier;
    status: string;
    monthlyMinutes: number;
    minutesUsed: number;
    overage: number;
    basePriceUSD: number;
    totalChargesUSD: number;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  };
}

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, router]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery) {
      const filtered = users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);

      // Calculate stats
      const totalRevenue = data.users.reduce(
        (sum: number, user: User) => sum + (user.subscription?.totalChargesUSD || 0),
        0
      );
      const activeSubscriptions = data.users.filter(
        (user: User) => user.subscription && user.subscription.tier !== 'FREE'
      ).length;

      setStats({
        totalRevenue,
        totalUsers: data.users.length,
        activeSubscriptions,
      });
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier?: SubscriptionTier) => {
    if (!tier) return 'bg-gray-100 text-gray-800';
    switch (tier) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800';
      case 'PRO':
        return 'bg-blue-100 text-blue-800';
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'TRIALING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAST_DUE':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user subscriptions and billing
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {stats.activeSubscriptions} active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered businesses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Selected User Details */}
      {selectedUser && selectedUser.subscription && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedUser.email}
            </CardTitle>
            <CardDescription>Subscription Details</CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionManager
              subscription={{
                ...selectedUser.subscription,
                user: {
                  id: selectedUser.id,
                  email: selectedUser.email,
                  name: selectedUser.name,
                },
              }}
              onUpdate={() => {
                fetchUsers();
                setSelectedUser(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>View and manage user subscriptions</CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Monthly Charge</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name || user.email}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>{user.businessName || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getTierColor(user.subscription?.tier)}>
                        {user.subscription?.tier || 'FREE'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.subscription?.status)}>
                        {user.subscription?.status || 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.subscription ? (
                        <div className="text-sm">
                          {user.subscription.minutesUsed.toFixed(0)} / {user.subscription.monthlyMinutes} min
                          {user.subscription.overage > 0 && (
                            <span className="text-red-600 ml-1">
                              (+{user.subscription.overage.toFixed(0)})
                            </span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      ${user.subscription?.totalChargesUSD.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
