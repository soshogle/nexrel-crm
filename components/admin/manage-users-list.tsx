/**
 * Manage Users List Component
 * Displays all business accounts with search, filter, and edit capabilities
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EditBusinessDialog from './edit-business-dialog';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  industry: string | null;
  accountStatus: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  suspendedReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  stats: {
    leads: number;
    voiceAgents: number;
    campaigns: number;
  };
  featureCount: number;
}

export default function ManageUsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [search, industryFilter, statusFilter, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(industryFilter && { industry: industryFilter }),
        ...(statusFilter && { accountStatus: statusFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error: any) {
      toast.error('Failed to fetch users', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleSaveSuccess = () => {
    fetchUsers(); // Refresh list
    toast.success('User updated successfully');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      ACTIVE: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
      TRIAL: { color: 'bg-blue-500/10 text-blue-500', icon: Clock },
      SUSPENDED: { color: 'bg-red-500/10 text-red-500', icon: XCircle },
      CANCELLED: { color: 'bg-gray-500/10 text-gray-500', icon: AlertCircle },
      DISABLED: { color: 'bg-red-500/10 text-red-500', icon: AlertCircle },
    };

    const config = variants[status] || variants.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      FREE: 'bg-gray-500/10 text-gray-500',
      PRO: 'bg-blue-500/10 text-blue-500',
      ENTERPRISE: 'bg-purple-500/10 text-purple-500',
    };

    return (
      <Badge variant="outline" className={colors[tier] || colors.FREE}>
        {tier === 'ENTERPRISE' && <Crown className="h-3 w-3 mr-1" />}
        {tier}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or business..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page
            }}
            className="pl-10"
          />
        </div>

        <Select
          value={industryFilter}
          onValueChange={(value) => {
            setIndustryFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Industries</SelectItem>
            <SelectItem value="RESTAURANT">Restaurant</SelectItem>
            <SelectItem value="DENTIST">Dentist</SelectItem>
            <SelectItem value="MEDICAL">Medical</SelectItem>
            <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
            <SelectItem value="TECHNOLOGY">Technology</SelectItem>
            <SelectItem value="CONSTRUCTION">Construction</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No users found matching your criteria
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name || 'Unnamed Business'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.industry ? (
                        <Badge variant="outline">{user.industry}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(user.accountStatus)}</TableCell>
                    <TableCell>{getTierBadge(user.subscriptionTier)}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>Leads: {user.stats.leads}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? (
                        <span className="text-sm">
                          {new Date(user.lastLoginAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      {selectedUser && (
        <EditBusinessDialog
          user={selectedUser}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}
