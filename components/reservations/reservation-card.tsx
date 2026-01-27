
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Phone, Mail, MapPin, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ReservationCardProps {
  reservation: any;
  onStatusChange?: (id: string, newStatus: string) => void;
  onCancel?: (id: string) => void;
}

export function ReservationCard({ reservation, onStatusChange, onCancel }: ReservationCardProps) {
  const [loading, setLoading] = useState(false);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500',
    CONFIRMED: 'bg-blue-500',
    SEATED: 'bg-green-500',
    COMPLETED: 'bg-gray-500',
    CANCELLED: 'bg-red-500',
    NO_SHOW: 'bg-orange-500',
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success(`Reservation ${newStatus.toLowerCase()}`);
      onStatusChange?.(reservation.id, newStatus);
    } catch (error) {
      toast.error('Failed to update reservation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to cancel reservation');

      toast.success('Reservation cancelled');
      onCancel?.(reservation.id);
    } catch (error) {
      toast.error('Failed to cancel reservation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{reservation.customerName}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(reservation.reservationDate), 'MMM dd, yyyy')}
              <Clock className="h-3 w-3 ml-2" />
              {reservation.reservationTime}
            </CardDescription>
          </div>
          <Badge className={statusColors[reservation.status]}>
            {reservation.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{reservation.partySize} guests</span>
          </div>
          {reservation.table && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{reservation.table.tableName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{reservation.customerPhone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{reservation.customerEmail}</span>
          </div>
        </div>

        {reservation.specialRequests && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Special Requests:</p>
            <p className="text-sm bg-muted p-2 rounded">{reservation.specialRequests}</p>
          </div>
        )}

        {reservation.occasion && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-purple-500" />
            <span className="text-purple-500 font-medium">Occasion: {reservation.occasion}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Confirmation Code: <span className="font-mono font-bold">{reservation.confirmationCode}</span>
        </div>

        {/* Quick Actions */}
        {reservation.status === 'PENDING' && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleStatusChange('CONFIRMED')}
              disabled={loading}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {reservation.status === 'CONFIRMED' && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleStatusChange('SEATED')}
              disabled={loading}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Seat Guests
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        )}

        {reservation.status === 'SEATED' && (
          <Button
            size="sm"
            onClick={() => handleStatusChange('COMPLETED')}
            disabled={loading}
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Complete
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
