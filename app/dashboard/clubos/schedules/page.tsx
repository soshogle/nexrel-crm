
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleCalendarView } from '@/components/clubos/schedule-calendar-view';
import { ScheduleListView } from '@/components/clubos/schedule-list-view';
import { CreateScheduleDialog } from '@/components/clubos/create-schedule-dialog';
import { EventDetailsDialog } from '@/components/clubos/event-details-dialog';

export default function SchedulesPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Filters
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [selectedProgram, selectedVenue, selectedEventType]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch schedules with filters
      const params = new URLSearchParams();
      if (selectedVenue !== 'all') params.append('venueId', selectedVenue);
      if (selectedEventType !== 'all') params.append('eventType', selectedEventType);

      const [schedulesRes, programsRes, venuesRes] = await Promise.all([
        fetch(`/api/clubos/schedules?${params.toString()}`),
        fetch('/api/clubos/programs'),
        fetch('/api/clubos/venues'),
      ]);

      // Check for errors
      if (!schedulesRes.ok || !programsRes.ok || !venuesRes.ok) {
        console.error('API Error:', { 
          schedules: schedulesRes.status, 
          programs: programsRes.status, 
          venues: venuesRes.status 
        });
        throw new Error('Failed to fetch data from server');
      }

      const schedulesData = await schedulesRes.json();
      const programsData = await programsRes.json();
      const venuesData = await venuesRes.json();

      // Safely extract arrays with multiple fallback checks
      const schedulesArray = Array.isArray(schedulesData) 
        ? schedulesData 
        : (Array.isArray(schedulesData?.schedules) ? schedulesData.schedules : []);
      
      const programsArray = programsData?.success 
        ? (Array.isArray(programsData.programs) ? programsData.programs : [])
        : (Array.isArray(programsData?.programs) ? programsData.programs : (Array.isArray(programsData) ? programsData : []));
      
      const venuesArray = Array.isArray(venuesData) 
        ? venuesData 
        : (Array.isArray(venuesData?.venues) ? venuesData.venues : []);

      console.log('📊 Schedule page data loaded:', {
        schedules: schedulesArray.length,
        programs: programsArray.length,
        venues: venuesArray.length
      });

      setSchedules(schedulesArray);
      setPrograms(programsArray);
      setVenues(venuesArray);
    } catch (error: any) {
      console.error('❌ Error loading schedule data:', error);
      toast.error('Failed to load schedules: ' + (error.message || 'Unknown error'));
      // Set empty arrays on error
      setSchedules([]);
      setPrograms([]);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCreated = () => {
    fetchData();
    setIsCreateDialogOpen(false);
    toast.success('Schedule created successfully');
  };

  const handleScheduleUpdated = () => {
    fetchData();
    toast.success('Schedule updated successfully');
  };

  const handleScheduleDeleted = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/clubos/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete schedule');

      fetchData();
      toast.success('Schedule cancelled successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to cancel schedule');
    }
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsCreateDialogOpen(true);
  };

  const upcomingCount = schedules.filter(
    (s) => new Date(s.startTime) > new Date() && s.status === 'SCHEDULED'
  ).length;

  const todayCount = schedules.filter((s) => {
    const today = new Date();
    const scheduleDate = new Date(s.startTime);
    return (
      scheduleDate.toDateString() === today.toDateString() &&
      s.status === 'SCHEDULED'
    );
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Schedule Management</h1>
          <p className="text-muted-foreground">
            Manage games, practices, and events
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Today's Events</CardDescription>
            <CardTitle className="text-4xl">{todayCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Upcoming Events</CardDescription>
            <CardTitle className="text-4xl">{upcomingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Venues</CardDescription>
            <CardTitle className="text-4xl">{venues.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">View</label>
            <Select value={view} onValueChange={(val: any) => setView(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Venue</label>
            <Select value={selectedVenue} onValueChange={setSelectedVenue}>
              <SelectTrigger>
                <SelectValue placeholder="All Venues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Event Type</label>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="GAME">Games</SelectItem>
                <SelectItem value="PRACTICE">Practices</SelectItem>
                <SelectItem value="TOURNAMENT">Tournaments</SelectItem>
                <SelectItem value="TRYOUT">Tryouts</SelectItem>
                <SelectItem value="MEETING">Meetings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Program</label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger>
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Views */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Loading schedules...</p>
          </CardContent>
        </Card>
      ) : view === 'calendar' ? (
        <ScheduleCalendarView
          schedules={schedules}
          onScheduleUpdated={handleScheduleUpdated}
          onScheduleDeleted={handleScheduleDeleted}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      ) : (
        <ScheduleListView
          schedules={schedules}
          onScheduleUpdated={handleScheduleUpdated}
          onScheduleDeleted={handleScheduleDeleted}
        />
      )}

      {/* Create Schedule Dialog */}
      <CreateScheduleDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setSelectedDate(null); // Clear selected date when dialog closes
          }
        }}
        onScheduleCreated={handleScheduleCreated}
        venues={venues}
        programs={programs}
        initialDate={selectedDate}
      />

      {/* Event Details Dialog */}
      <EventDetailsDialog
        open={isEventDetailsOpen}
        onOpenChange={setIsEventDetailsOpen}
        event={selectedEvent}
        onDelete={handleScheduleDeleted}
      />
    </div>
  );
}
