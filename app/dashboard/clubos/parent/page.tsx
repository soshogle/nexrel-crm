
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Calendar, DollarSign, Bell, Trophy, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import Link from 'next/link';

interface ParentDashboardData {
  household: {
    id: string;
    primaryContactName: string;
    primaryContactEmail: string;
    members: Array<{
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      registrations: Array<{
        id: string;
        status: string;
        totalAmount: number;
        amountPaid: number;
        balanceDue: number;
        program: {
          name: string;
          startDate: string;
          endDate: string;
        };
        division?: {
          name: string;
        };
      }>;
    }>;
  };
  upcomingSchedules: Array<{
    id: string;
    title: string;
    eventType: string;
    startTime: string;
    endTime: string;
    venue?: {
      name: string;
    };
  }>;
  totalBalance: number;
  activeRegistrations: number;
  pendingRegistrations: number;
}

export default function ParentDashboardPage() {
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/clubos/parent/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setData(result);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-7xl py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Unable to load dashboard data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();
  const nextWeek = addDays(today, 7);
  const upcomingEvents = data.upcomingSchedules.filter(
    (schedule) => isAfter(new Date(schedule.startTime), today) && isBefore(new Date(schedule.startTime), nextWeek)
  );

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {data.household.primaryContactName.split(' ')[0]}! 👋</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your family's sports activities
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.household.members.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeRegistrations}</div>
            <p className="text-xs text-muted-foreground">
              {data.pendingRegistrations > 0 && `${data.pendingRegistrations} pending approval`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data.totalBalance / 100).toFixed(2)}
            </div>
            {data.totalBalance > 0 && (
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link href="/dashboard/clubos/parent/payments">Make payment</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Your family's schedule for the next week</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/clubos/parent/schedules">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming events this week</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        {event.eventType === 'GAME' ? (
                          <Trophy className="h-6 w-6 text-primary" />
                        ) : (
                          <Calendar className="h-6 w-6 text-primary" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startTime), 'EEE, MMM d • h:mm a')}
                      </p>
                      {event.venue && (
                        <p className="text-xs text-muted-foreground">{event.venue.name}</p>
                      )}
                    </div>
                    <Badge variant="outline">{event.eventType}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Registrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Registrations</CardTitle>
                <CardDescription>Your family's current programs</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/clubos/register">Register</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.household.members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No family members registered yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/clubos/parent/family">Add Family Member</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.household.members.map((member) => (
                  <div key={member.id} className="space-y-2">
                    <h4 className="font-medium">
                      {member.firstName} {member.lastName}
                    </h4>
                    {member.registrations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active registrations</p>
                    ) : (
                      <div className="space-y-2">
                        {member.registrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{reg.program.name}</p>
                              {reg.division && (
                                <p className="text-xs text-muted-foreground">{reg.division.name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  reg.status === 'ACTIVE'
                                    ? 'default'
                                    : reg.status === 'APPROVED'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {reg.status}
                              </Badge>
                              {reg.balanceDue > 0 && (
                                <Badge variant="destructive">
                                  ${(reg.balanceDue / 100).toFixed(2)} due
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {data.totalBalance > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              You have an outstanding balance of <strong>${(data.totalBalance / 100).toFixed(2)}</strong>
            </p>
            <Button asChild>
              <Link href="/dashboard/clubos/parent/payments">Make Payment Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
