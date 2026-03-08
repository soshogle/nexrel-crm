/**
 * Appointments Page - Monday.com style with industry-aware terminology
 */

"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, List, BarChart3, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import MondayAppointments from "@/components/appointments/monday-appointments";
import { getIndustryBookingConfig } from "@/lib/industry-booking-config";

export default function AppointmentsPage() {
  const { data: session, status: sessionStatus } = useSession() || {};
  const [resolvedIndustry, setResolvedIndustry] = useState<string | null>(
    ((session?.user as any)?.industry as string) || null,
  );
  const isAdmin =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";
  const industry =
    resolvedIndustry || ((session?.user as any)?.industry as string) || null;
  const config = getIndustryBookingConfig(industry);

  const [view, setView] = useState<"board" | "list" | "calendar" | "analytics">(
    "board",
  );
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const fromSession = ((session?.user as any)?.industry as string) || null;
    if (fromSession) {
      setResolvedIndustry(fromSession);
      return;
    }

    if (sessionStatus === "authenticated") {
      fetch("/api/session/context")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = (data?.industry as string | null) || null;
          if (resolved) setResolvedIndustry(resolved);
        })
        .catch(() => {});
    }
  }, [sessionStatus, (session?.user as any)?.industry]);

  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.appointments)
            ? data.appointments
            : Array.isArray(data?.data)
              ? data.data
              : [];
        setAppointments(Array.isArray(raw) ? raw : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return {
      total: appointments.length,
      scheduled: appointments.filter((a) => a.status === "SCHEDULED").length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
      cancelled: appointments.filter((a) =>
        ["CANCELLED", "NO_SHOW"].includes(a.status),
      ).length,
      thisWeek: appointments.filter((a) => {
        try {
          return new Date(a.startTime) >= weekStart;
        } catch {
          return false;
        }
      }).length,
    };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 antialiased">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 antialiased">
              <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              {config.bookingPluralNoun}
            </h1>
            <p className="text-gray-700 mt-2 text-sm font-medium antialiased">
              Manage your schedule and {config.bookingPluralNoun.toLowerCase()}
            </p>
          </div>
          {isAdmin && (
            <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">
              <Plus className="h-4 w-4 mr-2" />
              New {config.bookingNoun}
            </Button>
          )}
        </div>

        {/* Main Card */}
        <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="border-b border-purple-200/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 text-xl font-semibold antialiased">
                  All {config.bookingPluralNoun}
                </CardTitle>
                <CardDescription className="text-gray-700 font-medium antialiased">
                  {appointments.length} {config.bookingPluralNoun.toLowerCase()}
                </CardDescription>
              </div>
              <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                <TabsList className="bg-white/80 border border-purple-200 backdrop-blur-sm">
                  <TabsTrigger
                    value="board"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700"
                  >
                    📋 Board
                  </TabsTrigger>
                  <TabsTrigger
                    value="list"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700"
                  >
                    <List className="h-4 w-4 mr-1" /> List
                  </TabsTrigger>
                  <TabsTrigger
                    value="calendar"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700"
                  >
                    <Calendar className="h-4 w-4 mr-1" /> Calendar
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700"
                  >
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
            ) : view === "board" ? (
              <MondayAppointments isAdmin={isAdmin} />
            ) : view === "list" ? (
              <div className="space-y-2">
                {!Array.isArray(appointments) || appointments.length === 0 ? (
                  <div className="text-center py-12 text-gray-700 font-semibold antialiased">
                    No {config.bookingPluralNoun.toLowerCase()}
                  </div>
                ) : (
                  appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-4 border-2 border-purple-200/50 bg-white/80 rounded-lg hover:border-purple-300 transition-all shadow-sm"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 antialiased">
                          {apt.title}
                        </p>
                        <p className="text-sm font-medium text-gray-700 antialiased">
                          {new Date(apt.startTime).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold antialiased ${
                          apt.status === "CONFIRMED"
                            ? "bg-green-500/10 text-green-600 border border-green-500/30"
                            : apt.status === "SCHEDULED"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                              : apt.status === "COMPLETED"
                                ? "bg-purple-600 text-white border border-purple-500/30"
                                : "bg-red-500/10 text-red-600 border border-red-500/30"
                        }`}
                      >
                        {apt.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : view === "calendar" ? (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600 mb-4">
                  View the full {config.bookingNoun.toLowerCase()} calendar
                </p>
                <Button
                  variant="outline"
                  className="border-purple-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
                  asChild
                >
                  <Link href="/dashboard/calendar">Open Full Calendar</Link>
                </Button>
              </div>
            ) : (
              /* Analytics */
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border-2 border-purple-200/50 bg-white/80 rounded-xl p-5 shadow-sm">
                    <div className="text-3xl font-bold text-gray-900 antialiased">
                      {stats.scheduled}
                    </div>
                    <div className="text-gray-700 text-sm font-semibold antialiased">
                      Scheduled
                    </div>
                  </div>
                  <div className="border-2 border-purple-200/50 bg-white/80 rounded-xl p-5 shadow-sm">
                    <div className="text-3xl font-bold text-gray-900 antialiased">
                      {stats.confirmed}
                    </div>
                    <div className="text-gray-700 text-sm font-semibold antialiased">
                      Confirmed
                    </div>
                  </div>
                  <div className="border-2 border-purple-200/50 bg-white/80 rounded-xl p-5 shadow-sm">
                    <div className="text-3xl font-bold text-gray-900 antialiased">
                      {stats.completed}
                    </div>
                    <div className="text-gray-700 text-sm font-semibold antialiased">
                      Completed
                    </div>
                  </div>
                  <div className="border-2 border-purple-200/50 bg-white/80 rounded-xl p-5 shadow-sm">
                    <div className="text-3xl font-bold text-gray-900 antialiased">
                      {stats.cancelled}
                    </div>
                    <div className="text-gray-700 text-sm font-semibold antialiased">
                      Cancelled
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-2 border-purple-200/50 bg-white/80 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Completion Rate
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-purple-600">
                        {stats.total > 0
                          ? Math.round((stats.completed / stats.total) * 100)
                          : 0}
                        %
                      </div>
                      <div className="flex-1 h-4 bg-purple-100 rounded-full overflow-hidden border border-purple-200/50">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all duration-700"
                          style={{
                            width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-2 border-purple-200/50 bg-white/80 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      This Week
                    </h3>
                    <div className="text-4xl font-bold text-purple-600">
                      {stats.thisWeek}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {config.bookingPluralNoun.toLowerCase()} scheduled
                    </div>
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
