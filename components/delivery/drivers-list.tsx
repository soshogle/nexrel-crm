
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, User, Star, Car, Phone } from 'lucide-react';
import { CreateDriverDialog } from './create-driver-dialog';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicleType: string;
  vehicleColor: string | null;
  vehicleModel: string | null;
  licensePlate: string | null;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  pendingEarnings: number;
  isAvailable: boolean;
  isActive: boolean;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  OFFLINE: 'bg-gray-500',
  AVAILABLE: 'bg-green-500',
  BUSY: 'bg-yellow-500',
  ON_BREAK: 'bg-blue-500',
};

const statusLabels: Record<string, string> = {
  OFFLINE: 'Offline',
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  ON_BREAK: 'On Break',
};

export function DriversList() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/delivery/drivers');
      if (!response.ok) throw new Error('Failed to fetch drivers');

      const data = await response.json();
      setDrivers(data);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (driverId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/delivery/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update driver status');

      toast.success(`Driver ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchDrivers();
    } catch (error: any) {
      console.error('Error updating driver:', error);
      toast.error('Failed to update driver status');
    }
  };

  const handleToggleAvailability = async (driverId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/delivery/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isAvailable: !currentStatus,
          status: !currentStatus ? 'AVAILABLE' : 'OFFLINE'
        }),
      });

      if (!response.ok) throw new Error('Failed to update driver availability');

      toast.success(`Driver marked as ${!currentStatus ? 'available' : 'unavailable'}`);
      fetchDrivers();
    } catch (error: any) {
      console.error('Error updating driver:', error);
      toast.error('Failed to update driver availability');
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.includes(searchQuery) ||
      (driver.email && driver.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const stats = {
    total: drivers.length,
    active: drivers.filter((d) => d.isActive).length,
    available: drivers.filter((d) => d.isAvailable).length,
    busy: drivers.filter((d) => d.status === 'BUSY').length,
    totalEarnings: drivers.reduce((sum, d) => sum + Number(d.totalEarnings), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Drivers</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.available}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Busy</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.busy}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earnings</CardDescription>
            <CardTitle className="text-3xl">${stats.totalEarnings.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Drivers</CardTitle>
              <CardDescription>Manage your delivery drivers</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Driver
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No drivers found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{driver.name}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {Number(driver.rating).toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {driver.phone}
                          </div>
                          {driver.email && (
                            <div className="text-muted-foreground">{driver.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            <span className="capitalize">{driver.vehicleType.toLowerCase()}</span>
                          </div>
                          {driver.vehicleColor && driver.vehicleModel && (
                            <div className="text-sm text-muted-foreground">
                              {driver.vehicleColor} {driver.vehicleModel}
                            </div>
                          )}
                          {driver.licensePlate && (
                            <div className="text-sm text-muted-foreground">
                              {driver.licensePlate}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{driver.totalDeliveries} deliveries</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">${Number(driver.totalEarnings).toFixed(2)}</div>
                          {Number(driver.pendingEarnings) > 0 && (
                            <div className="text-muted-foreground">
                              Pending: ${Number(driver.pendingEarnings).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[driver.status]}>
                          {statusLabels[driver.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={driver.isAvailable}
                          onCheckedChange={() => handleToggleAvailability(driver.id, driver.isAvailable)}
                          disabled={!driver.isActive}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={driver.isActive}
                          onCheckedChange={() => handleToggleActive(driver.id, driver.isActive)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateDriverDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchDrivers}
      />
    </div>
  );
}
