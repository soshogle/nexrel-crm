'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Link2 } from 'lucide-react';

interface CalendarConfigSectionProps {
  actionConfig: Record<string, unknown>;
  onConfigChange: (updates: Record<string, unknown>) => void;
}

export function CalendarConfigSection({ actionConfig, onConfigChange }: CalendarConfigSectionProps) {
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar-connections')
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((d) => {
        const conns = d.connections || [];
        setCalendars(conns.map((c: { id: string; calendarName?: string; provider?: string }) => ({
          id: c.id,
          name: c.calendarName || c.provider || `Calendar ${c.id.slice(0, 8)}`,
        })));
      })
      .catch(() => setCalendars([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedCalendarId = (actionConfig.calendarId as string) || '';

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading calendars...</p>;
  }

  if (calendars.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-violet-200 bg-white p-4 text-center">
        <Calendar className="w-10 h-10 text-violet-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">No calendars connected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Connect a calendar first to create appointments from this workflow.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={() => window.open('/dashboard/settings?tab=integrations', '_blank')}
        >
          <Link2 className="w-4 h-4 mr-2" />
          Connect Calendar
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-xs">Select Calendar</Label>
      <Select
        value={selectedCalendarId || 'default'}
        onValueChange={(v) => onConfigChange({ calendarId: v === 'default' ? undefined : v })}
      >
        <SelectTrigger className="bg-white border-violet-200 mt-1">
          <SelectValue placeholder="Choose calendar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default / First available</SelectItem>
          {calendars.map((cal) => (
            <SelectItem key={cal.id} value={cal.id}>
              {cal.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
