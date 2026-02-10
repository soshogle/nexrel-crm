/**
 * Appointments Page - Monday.com style with tabs
 */

'use client';

export const dynamic = 'force-dynamic';

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
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-6 space-y-6">
        {/* Soshogle Style Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              Appointments
            </h1>
            <p className="text-purple-300/70 mt-2 text-sm">Manage your schedule and appointments</p>
          </div>
          {isAdmin && (
            <Button className="gradient-primary hover:opacity-90 text-white shadow-lg shadow-purple-500/30">
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          )}
        </div>

        {/* Soshogle Style Tabs */}
        <Card className="glass-effect border-purple-500/20 shadow-xl">
          <CardHeader className="border-b border-purple-500/20 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-xl">All Appointments</CardTitle>
                <CardDescription className="text-purple-300/60">{appointments.length} appointments</CardDescription>
              </div>
              <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                <TabsList className="bg-black/40 border border-purple-500/20">
                  <TabsTrigger value="board" className="data-[state=active]:gradient-primary data-[state=active]:text-white text-purple-300/70 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30">
                    📋 Board
                  </TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:gradient-primary data-[state=active]:text-white text-purple-300/70 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30">
                    <List className="h-4 w-4 mr-1" /> List
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="data-[state=active]:gradient-primary data-[state=active]:text-white text-purple-300/70 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30">
                    <Calendar className="h-4 w-4 mr-1" /> Calendar
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:gradient-primary data-[state=active]:text-white text-purple-300/70 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30">
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
                  <div className="text-center py-12 text-purple-300/50">No appointments</div>
                ) : (
                  appointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-4 glass-effect rounded-lg border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                      <div>
                        <p className="font-medium text-white">{apt.title}</p>
                        <p className="text-sm text-purple-300/60">{new Date(apt.startTime).toLocaleString()}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        apt.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        apt.status === 'COMPLETED' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
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
                <p className="text-purple-300/60">Calendar view</p>
                <Button variant="outline" className="mt-4 border-purple-500/40 text-purple-300 hover:border-purple-500 hover:text-purple-400 hover:bg-purple-500/10" asChild>
                  <Link href="/dashboard/calendar">Open Full Calendar</Link>
                </Button>
              </div>
            ) : (
              /* Analytics View */
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="gradient-primary rounded-xl p-5 shadow-lg shadow-purple-500/20">
                    <div className="text-3xl font-bold text-white">{stats.scheduled}</div>
                    <div className="text-purple-100 text-sm">Scheduled</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-5 shadow-lg shadow-green-500/20">
                    <div className="text-3xl font-bold text-white">{stats.confirmed}</div>
                    <div className="text-green-100 text-sm">Confirmed</div>
                  </div>
                  <div className="gradient-primary rounded-xl p-5 shadow-lg shadow-purple-500/20">
                    <div className="text-3xl font-bold text-white">{stats.completed}</div>
                    <div className="text-purple-100 text-sm">Completed</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-xl p-5 shadow-lg shadow-red-500/20">
                    <div className="text-3xl font-bold text-white">{stats.cancelled}</div>
                    <div className="text-red-100 text-sm">Cancelled</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-effect rounded-xl p-6 border-purple-500/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Completion Rate</h3>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold gradient-text">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </div>
                      <div className="flex-1 h-4 bg-black/40 rounded-full overflow-hidden border border-purple-500/20">
                        <div 
                          className="h-full gradient-primary rounded-full"
                          style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="glass-effect rounded-xl p-6 border-purple-500/20">
                    <h3 className="text-lg font-semibold text-white mb-4">This Week</h3>
                    <div className="text-4xl font-bold gradient-text">{stats.thisWeek}</div>
                    <div className="text-purple-300/60 text-sm">appointments scheduled</div>
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
