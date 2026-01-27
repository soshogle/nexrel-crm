
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Users } from 'lucide-react';
import { ReservationList } from './reservation-list';

export function ReservationCalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reservationCounts, setReservationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservationCounts();
  }, []);

  const fetchReservationCounts = async () => {
    try {
      setLoading(true);
      // Fetch counts for the current month
      const response = await fetch('/api/reservations?pageSize=1000');
      
      if (!response.ok) throw new Error('Failed to fetch reservations');

      const data = await response.json();
      const counts: Record<string, number> = {};

      data.reservations?.forEach((reservation: any) => {
        const dateKey = new Date(reservation.reservationDate).toISOString().split('T')[0];
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      });

      setReservationCounts(counts);
    } catch (error) {
      console.error('Error fetching reservation counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateCount = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return reservationCounts[dateKey] || 0;
  };

  const selectedDateStr = selectedDate?.toISOString().split('T')[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Date
          </CardTitle>
          <CardDescription>
            Click on a date to view reservations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              hasReservations: (date) => getDateCount(date) > 0,
            }}
            modifiersStyles={{
              hasReservations: {
                fontWeight: 'bold',
                textDecoration: 'underline',
              },
            }}
          />

          {/* Legend */}
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Legend</p>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Has reservations</span>
            </div>
          </div>

          {/* Selected Date Info */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">
                {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {getDateCount(selectedDate)} reservation{getDateCount(selectedDate) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reservations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">
              {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select a date'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {selectedDate && getDateCount(selectedDate) > 0
                ? `${getDateCount(selectedDate)} reservation${getDateCount(selectedDate) !== 1 ? 's' : ''} scheduled`
                : 'No reservations for this date'}
            </p>
          </div>
        </div>

        {selectedDate && (
          <ReservationList date={selectedDateStr} />
        )}
      </div>
    </div>
  );
}
