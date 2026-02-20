'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Link2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const PRESET_EVENT_TYPES = [
  { value: 'listing_visit', label: 'Listing Visit' },
  { value: 'home_evaluation', label: 'Home Evaluation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'notary', label: 'Notary' },
  { value: 'listing_presentation', label: 'Listing Presentation' },
  { value: 'open_house', label: 'Open House' },
  { value: 'buyer_consultation', label: 'Buyer Consultation' },
  { value: 'seller_consultation', label: 'Seller Consultation' },
  { value: 'closing', label: 'Closing' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'walkthrough', label: 'Final Walkthrough' },
  { value: 'client_meeting', label: 'Client Meeting' },
  { value: 'follow_up', label: 'Follow-Up Call' },
  { value: 'team_meeting', label: 'Team Meeting' },
  { value: 'demo', label: 'Demo / Presentation' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'onboarding', label: 'Onboarding Session' },
  { value: 'review', label: 'Review / Check-in' },
  { value: 'custom', label: 'Custom Event...' },
];

interface CalendarConfigSectionProps {
  actionConfig: Record<string, unknown>;
  onConfigChange: (updates: Record<string, unknown>) => void;
}

export function CalendarConfigSection({ actionConfig, onConfigChange }: CalendarConfigSectionProps) {
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string }>>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/calendar-connections')
        .then((r) => (r.ok ? r.json() : { connections: [] }))
        .then((d) => {
          const conns = d.connections || [];
          return conns.map((c: { id: string; calendarName?: string; provider?: string }) => ({
            id: c.id,
            name: c.calendarName || c.provider || `Calendar ${c.id.slice(0, 8)}`,
          }));
        })
        .catch(() => []),
      fetch('/api/team')
        .then((r) => (r.ok ? r.json() : { members: [] }))
        .then((d) => {
          const members = d.members || d.teamMembers || [];
          return Array.isArray(members) ? members : [];
        })
        .catch(() => []),
    ]).then(([cals, members]) => {
      setCalendars(cals);
      setTeamMembers(members);
      setLoading(false);
    });
  }, []);

  const selectedCalendarId = (actionConfig.calendarId as string) || '';
  const selectedEventType = (actionConfig.calendarEventType as string) || '';
  const calendarOwner = (actionConfig.calendarOwner as string) || 'self';
  const customEventName = (actionConfig.calendarCustomEventName as string) || '';

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
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Whose Calendar</Label>
        <Select
          value={calendarOwner}
          onValueChange={(v) => onConfigChange({ calendarOwner: v === 'self' ? undefined : v })}
        >
          <SelectTrigger className="bg-white border-violet-200 mt-1">
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self">My Calendar</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <div>
        <Label className="text-xs">Event Type</Label>
        <Select
          value={selectedEventType || 'none'}
          onValueChange={(v) => onConfigChange({
            calendarEventType: v === 'none' ? undefined : v,
            calendarCustomEventName: v === 'custom' ? customEventName : undefined,
          })}
        >
          <SelectTrigger className="bg-white border-violet-200 mt-1">
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="max-h-56">
              <SelectItem value="none">Select an event type...</SelectItem>
              {PRESET_EVENT_TYPES.map((evt) => (
                <SelectItem key={evt.value} value={evt.value}>
                  {evt.label}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
        {selectedEventType === 'custom' && (
          <Input
            value={customEventName}
            onChange={(e) => onConfigChange({ calendarCustomEventName: e.target.value || undefined })}
            placeholder="Enter custom event name..."
            className="mt-2 bg-white border-violet-200"
          />
        )}
      </div>
    </div>
  );
}
