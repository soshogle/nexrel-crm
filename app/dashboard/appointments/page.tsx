/**
 * Appointments Page - Monday.com style with tabs
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, List, LayoutGrid, BarChart3, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import MondayAppointments from '@/components/appointments/monday-appointments';

export default function AppointmentsPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'SUPER_ADMIN';
  const [view, setView] = useState<'board' | 'list' | 'calendar' | 'analytics'>('board');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Analytics data
  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'SCHEDULED').length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => ['CANCELLED', 'NO_SHOW'].includes(a.status)).length,
    thisWeek: appointments.filter(a => {
      const d = new Date(a.startTime);
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      return d >= weekStart;
    }).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto py-6 space-y-6">
        {/* Monday.com Style Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              Appointments
            </h1>
            <p className="text-purple-200 mt-1">Manage your schedule and appointments</p>
          </div>
          {isAdmin && (
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          )}
        </div>

        {/* Monday.com Style Tabs */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="border-b border-slate-700 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">All Appointments</CardTitle>
                <CardDescription className="text-slate-400">{appointments.length} appointments</CardDescription>
              </div>
              <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                <TabsList className="bg-slate-700/50">
                  <TabsTrigger value="board" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                    📋 Board
                  </TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                    <List className="h-4 w-4 mr-1" /> List
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                    <Calendar className="h-4 w-4 mr-1" /> Calendar
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300">
                    <BarChart3 className="h-4 w-4 mr-1" /> Analytics
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : view === 'board' ? (
              <MondayAppointments isAdmin={isAdmin} />
            ) : view === 'list' ? (
              <div className="space-y-2">
                {appointments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">No appointments</div>
                ) : (
                  appointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600 hover:border-purple-500 transition-colors">
                      <div>
                        <p className="font-medium text-white">{apt.title}</p>
                        <p className="text-sm text-slate-400">{new Date(apt.startTime).toLocaleString()}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                        apt.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' :
                        apt.status === 'COMPLETED' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {apt.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : view === 'calendar' ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-purple-400 mb-4" />
                <p className="text-slate-400">Calendar view</p>
                <Button variant="outline" className="mt-4 border-purple-500 text-purple-400" asChild>
                  <Link href="/dashboard/calendar">Open Full Calendar</Link>
                </Button>
              </div>
            ) : (
              /* Analytics View */
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5">
                    <div className="text-3xl font-bold text-white">{stats.scheduled}</div>
                    <div className="text-blue-200 text-sm">Scheduled</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5">
                    <div className="text-3xl font-bold text-white">{stats.confirmed}</div>
                    <div className="text-green-200 text-sm">Confirmed</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5">
                    <div className="text-3xl font-bold text-white">{stats.completed}</div>
                    <div className="text-purple-200 text-sm">Completed</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-5">
                    <div className="text-3xl font-bold text-white">{stats.cancelled}</div>
                    <div className="text-red-200 text-sm">Cancelled</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600">
                    <h3 className="text-lg font-semibold text-white mb-4">Completion Rate</h3>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-green-400">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </div>
                      <div className="flex-1 h-4 bg-slate-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                          style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600">
                    <h3 className="text-lg font-semibold text-white mb-4">This Week</h3>
                    <div className="text-4xl font-bold text-purple-400">{stats.thisWeek}</div>
                    <div className="text-slate-400 text-sm">appointments scheduled</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
