'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, List, Plus, RefreshCw, CalendarDays, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CalendarView } from '@/components/calendar/calendar-view';
import { AppointmentsList } from '@/components/calendar/appointments-list';
import { CreateAppointmentDialog } from '@/components/calendar/create-appointment-dialog';
import { getIndustryBookingConfig } from '@/lib/industry-booking-config';
import type { Appointment } from '@/types/appointment';

export default function CalendarPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [resolvedIndustry, setResolvedIndustry] = useState<string | null>(
    ((session?.user as any)?.industry as string) || null,
  );

  const industry =
    resolvedIndustry || ((session?.user as any)?.industry as string) || null;
  const config = getIndustryBookingConfig(industry);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return; }
    if (status === 'authenticated') { fetchAppointments(); }
  }, [status, router]);

  useEffect(() => {
    const fromSession = ((session?.user as any)?.industry as string) || null;
    if (fromSession) {
      setResolvedIndustry(fromSession);
      return;
    }

    if (status === 'authenticated') {
      fetch('/api/session/context')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = (data?.industry as string | null) || null;
          if (resolved) setResolvedIndustry(resolved);
        })
        .catch(() => {});
    }
  }, [status, (session?.user as any)?.industry]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/appointments');
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data
          : Array.isArray(data?.appointments) ? data.appointments
          : Array.isArray(data?.data) ? data.data : [];
        setAppointments(list);
      } else {
        throw new Error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error(`Failed to load ${config.bookingPluralNoun.toLowerCase()}`);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateDialog(true);
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    let today = 0, upcoming = 0;
    for (const apt of appointments) {
      try {
        if (!apt?.startTime || !apt?.status || apt.status === 'CANCELLED') continue;
        const d = new Date(apt.startTime);
        if (isNaN(d.getTime())) continue;
        if (d.toDateString() === todayStr) today++;
        if (d > now) upcoming++;
      } catch { /* skip */ }
    }
    return { today, upcoming, total: appointments.length };
  }, [appointments]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/20">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">{config.bookingPluralNoun}</h1>
            <p className="text-purple-300 mt-0.5 text-sm">Manage your {config.bookingPluralNoun.toLowerCase()} and schedule</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchAppointments}
            className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:border-purple-500/40 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gradient-primary hover:opacity-90 text-white shadow-lg shadow-purple-500/30"
          >
            <Plus className="h-4 w-4 mr-2" />
            New {config.bookingNoun}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-effect border-purple-500/20 hover:border-purple-500/30 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-purple-400">Today</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text">{stats.today}</div>
            <p className="text-xs font-bold text-purple-400 mt-1">{config.bookingPluralNoun.toLowerCase()} today</p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-purple-500/20 hover:border-purple-500/30 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-purple-400">Upcoming</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{stats.upcoming}</div>
            <p className="text-xs font-bold text-purple-400 mt-1">scheduled ahead</p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-purple-500/20 hover:border-purple-500/30 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-purple-400">Total</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-pink-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-400">{stats.total}</div>
            <p className="text-xs font-bold text-purple-400 mt-1">all {config.bookingPluralNoun.toLowerCase()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="bg-black/40 border border-purple-500/20">
          <TabsTrigger value="calendar" className="data-[state=active]:gradient-primary data-[state=active]:text-white text-white/80 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:gradient-primary data-[state=active]:text-white text-white/80 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30">
            <List className="h-4 w-4 mr-2" />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <CalendarView
              appointments={appointments}
              onDateClick={handleDateClick}
              onAppointmentUpdated={fetchAppointments}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <AppointmentsList
              appointments={appointments}
              onAppointmentUpdated={fetchAppointments}
              onAppointmentDeleted={fetchAppointments}
            />
          )}
        </TabsContent>
      </Tabs>

      <CreateAppointmentDialog
        open={showCreateDialog}
        onClose={() => { setShowCreateDialog(false); setSelectedDate(null); }}
        onSuccess={() => { fetchAppointments(); setShowCreateDialog(false); setSelectedDate(null); }}
        initialDate={selectedDate}
      />
    </div>
  );
}
