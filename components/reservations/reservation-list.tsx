
'use client';

import { useState, useEffect } from 'react';
import { ReservationCard } from './reservation-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ReservationListProps {
  date?: string;
  initialStatus?: string;
}

export function ReservationList({ date, initialStatus }: ReservationListProps) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all');

  useEffect(() => {
    fetchReservations();
  }, [date, statusFilter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (date) params.append('date', date);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/reservations?${params.toString()}`);
      
      if (!response.ok) throw new Error('Failed to fetch reservations');

      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleCancel = (id: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r))
    );
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reservation.customerName.toLowerCase().includes(query) ||
      reservation.customerEmail.toLowerCase().includes(query) ||
      reservation.customerPhone.includes(query) ||
      reservation.confirmationCode.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="SEATED">Seated</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="NO_SHOW">No Show</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={fetchReservations}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No reservations found</p>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onStatusChange={handleStatusChange}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && filteredReservations.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredReservations.length} of {reservations.length} reservations
        </div>
      )}
    </div>
  );
}
