'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, List, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CalendarView } from '@/components/calendar/calendar-view';
import { AppointmentsList } from '@/components/calendar/appointments-list';
import { CreateAppointmentDialog } from '@/components/calendar/create-appointment-dialog';
import type { Appointment } from '@/types/appointment';

export default function AppointmentsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchAppointments();
    }
  }, [status, router]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/appointments');
      if (response.ok) {
        const data = await response.json();
        
        // Validate data is an array
        if (Array.isArray(data)) {
          console.log('📅 Loaded', data.length, 'appointments');
          setAppointments(data);
        } else {
          console.error('❌ API returned non-array data:', data);
          toast.error('Invalid appointment data received');
          setAppointments([]);
        }
      } else {
        throw new Error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
      setAppointments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentUpdated = () => {
    fetchAppointments();
  };

  const handleAppointmentDeleted = () => {
    fetchAppointments();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateDialog(true);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Appointments</h1>
          <p className="text-gray-400 mt-1">Manage your appointments and meetings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAppointments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {appointments.filter(apt => {
                try {
                  if (!apt || !apt.startTime || !apt.status) return false;
                  const today = new Date();
                  const aptDate = new Date(apt.startTime);
                  return !isNaN(aptDate.getTime()) && 
                         aptDate.toDateString() === today.toDateString() && 
                         apt.status !== 'CANCELLED';
                } catch (error) {
                  console.error('Error filtering today\'s appointments:', error);
                  return false;
                }
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {appointments.filter(apt => {
                try {
                  if (!apt || !apt.startTime || !apt.status) return false;
                  const aptDate = new Date(apt.startTime);
                  const now = new Date();
                  return !isNaN(aptDate.getTime()) && 
                         aptDate > now && 
                         apt.status !== 'CANCELLED';
                } catch (error) {
                  console.error('Error filtering upcoming appointments:', error);
                  return false;
                }
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{appointments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Calendar and List View */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="bg-gray-900">
          <TabsTrigger value="calendar" className="data-[state=active]:bg-purple-600">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-purple-600">
            <List className="h-4 w-4 mr-2" />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <CalendarView
              appointments={appointments}
              onDateClick={handleDateClick}
              onAppointmentUpdated={handleAppointmentUpdated}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <AppointmentsList
              appointments={appointments}
              onAppointmentUpdated={handleAppointmentUpdated}
              onAppointmentDeleted={handleAppointmentDeleted}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Appointment Dialog */}
      <CreateAppointmentDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setSelectedDate(null);
        }}
        onSuccess={() => {
          fetchAppointments();
          setShowCreateDialog(false);
          setSelectedDate(null);
        }}
        initialDate={selectedDate}
      />
    </div>
  );
}
