
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotPickerProps {
  date: Date;
  partySize: number;
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
}

interface TimeSlot {
  time: string;
  tablesAvailable: number;
}

export function TimeSlotPicker({ date, partySize, selectedTime, onTimeSelect }: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableSlots();
  }, [date, partySize]);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(
        `/api/reservations/availability?date=${dateStr}&partySize=${partySize}`
      );

      if (!response.ok) throw new Error('Failed to fetch slots');

      const data = await response.json();
      setSlots(data.availableSlots || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No available time slots for this date and party size</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try selecting a different date or party size
        </p>
      </div>
    );
  }

  // Group slots by meal period
  const lunchSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(':')[0]);
    return hour >= 11 && hour < 15;
  });

  const dinnerSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(':')[0]);
    return hour >= 15;
  });

  const renderSlotGroup = (title: string, slotList: TimeSlot[]) => {
    if (slotList.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <div className="grid grid-cols-3 gap-2">
          {slotList.map((slot) => (
            <Button
              key={slot.time}
              variant={selectedTime === slot.time ? 'default' : 'outline'}
              onClick={() => onTimeSelect(slot.time)}
              className={cn(
                'relative',
                selectedTime === slot.time && 'ring-2 ring-primary'
              )}
            >
              <Clock className="h-3 w-3 mr-1" />
              {slot.time}
              {slot.tablesAvailable <= 3 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSlotGroup('Lunch', lunchSlots)}
      {renderSlotGroup('Dinner', dinnerSlots)}

      {selectedTime && (
        <div className="text-xs text-muted-foreground text-center">
          Selected time: {selectedTime}
        </div>
      )}
    </div>
  );
}
