
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react';

type RegistrationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'WAITLIST'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

interface Registration {
  id: string;
  status: RegistrationStatus;
  registrationDate: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  specialRequests?: string;
  member: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    email?: string;
    phone?: string;
  };
  program: {
    name: string;
    startDate: string;
    endDate: string;
    programType: string;
  };
  division: {
    name: string;
    practiceDay?: string;
    practiceTime?: string;
  };
  household: {
    primaryContactName: string;
    primaryContactEmail?: string;
    primaryContactPhone?: string;
  };
  waitlistEntry?: {
    position: number;
    notifiedDate?: string;
    responseDeadline?: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  waitlist: number;
  active: number;
}

export default function ClubOSAdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    waitlist: 0,
    active: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');

  // Get unique programs for filter
  const programs = Array.from(
    new Set(registrations.map((r) => r.program.name))
  ).sort();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  async function fetchRegistrations() {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      const response = await fetch(
        `/api/clubos/registrations?${queryParams.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setRegistrations(data.registrations);
        setStats(data.stats);
      } else {
        toast.error(data.error || 'Failed to load registrations');
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: RegistrationStatus) {
    try {
      const response = await fetch(`/api/clubos/registrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchRegistrations();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  }

  const getStatusBadge = (status: RegistrationStatus) => {
    const variants: Record<
      RegistrationStatus,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
    > = {
      PENDING: { variant: 'outline', label: 'Pending' },
      APPROVED: { variant: 'default', label: 'Approved' },
      WAITLIST: { variant: 'secondary', label: 'Waitlist' },
      ACTIVE: { variant: 'default', label: 'Active' },
      COMPLETED: { variant: 'secondary', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      REFUNDED: { variant: 'destructive', label: 'Refunded' },
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg) => {
    // Status filter
    if (statusFilter !== 'all' && reg.status !== statusFilter) {
      return false;
    }

    // Program filter
    if (programFilter !== 'all' && reg.program.name !== programFilter) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const memberName =
        `${reg.member.firstName} ${reg.member.lastName}`.toLowerCase();
      const programName = reg.program.name.toLowerCase();
      const contactName = reg.household.primaryContactName.toLowerCase();

      return (
        memberName.includes(query) ||
        programName.includes(query) ||
        contactName.includes(query)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ClubOS Admin</h1>
          <p className="text-gray-500 mt-1">
            Manage program registrations and approvals
          </p>
        </div>
        <Button onClick={fetchRegistrations} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waitlist}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="WAITLIST">Waitlist</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Program Filter */}
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(statusFilter !== 'all' ||
            programFilter !== 'all' ||
            searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setProgramFilter('all');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Registrations ({filteredRegistrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No registrations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {reg.member.firstName} {reg.member.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            Age:{' '}
                            {new Date().getFullYear() -
                              new Date(reg.member.dateOfBirth).getFullYear()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reg.program.name}</div>
                          <div className="text-sm text-gray-500">
                            {reg.program.programType}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reg.division.name}</div>
                          {reg.division.practiceDay && (
                            <div className="text-sm text-gray-500">
                              {reg.division.practiceDay}{' '}
                              {reg.division.practiceTime}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {reg.household.primaryContactName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reg.household.primaryContactEmail ||
                              reg.household.primaryContactPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(reg.status)}
                          {reg.waitlistEntry && (
                            <div className="text-xs text-gray-500">
                              Position: #{reg.waitlistEntry.position}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            ${(reg.totalAmount / 100).toFixed(2)}
                          </div>
                          {reg.balanceDue > 0 && (
                            <div className="text-sm text-red-500">
                              Due: ${(reg.balanceDue / 100).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(reg.registrationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {reg.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateStatus(reg.id, 'APPROVED')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateStatus(reg.id, 'CANCELLED')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {reg.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateStatus(reg.id, 'ACTIVE')}
                            >
                              Activate
                            </Button>
                          )}
                          {reg.status === 'WAITLIST' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(reg.id, 'APPROVED')}
                            >
                              Promote
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
