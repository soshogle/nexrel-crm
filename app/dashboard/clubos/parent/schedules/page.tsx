
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, MapPin, Clock, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface Schedule {
  id: string;
  title: string;
  eventType: string;
  status: string;
  startTime: string;
  endTime: string;
  venue?: {
    name: string;
    address?: string;
  };
  homeTeam?: {
    name: string;
  };
  awayTeam?: {
    name: string;
  };
  practiceTeam?: {
    name: string;
  };
}

export default function ParentSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/clubos/parent/schedules');
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'GAME':
        return 'bg-blue-500';
      case 'PRACTICE':
        return 'bg-green-500';
      case 'TOURNAMENT':
        return 'bg-purple-500';
      case 'TRYOUT':
        return 'bg-orange-500';
      case 'MEETING':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    const scheduleDate = new Date(schedule.startTime);
    if (filterStatus === 'upcoming') {
      return !isPast(scheduleDate);
    } else if (filterStatus === 'past') {
      return isPast(scheduleDate);
    }
    return true;
  });

  // Group schedules by date
  const groupedSchedules = filteredSchedules.reduce((groups, schedule) => {
    const date = format(new Date(schedule.startTime), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(schedule);
    return groups;
  }, {} as Record<string, Schedule[]>);

  const sortedDates = Object.keys(groupedSchedules).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Family Schedule</h1>
        <p className="text-muted-foreground">
          View all upcoming games, practices, and events for your family
        </p>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('upcoming')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'upcoming'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilterStatus('past')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'past'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Past
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Schedules */}
      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No schedules found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="text-xl font-semibold mb-4">
                {getDateLabel(groupedSchedules[date][0].startTime)}
              </h2>
              <div className="space-y-4">
                {groupedSchedules[date].map((schedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`h-12 w-12 ${getEventColor(schedule.eventType)} rounded-lg flex items-center justify-center`}>
                            {schedule.eventType === 'GAME' ? (
                              <Trophy className="h-6 w-6 text-white" />
                            ) : (
                              <Calendar className="h-6 w-6 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{schedule.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getEventColor(schedule.eventType)}>
                                  {schedule.eventType}
                                </Badge>
                                <Badge variant="outline">{schedule.status}</Badge>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(schedule.startTime), 'h:mm a')} -{' '}
                                {format(new Date(schedule.endTime), 'h:mm a')}
                              </span>
                            </div>
                            {schedule.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {schedule.venue.name}
                                  {schedule.venue.address && ` - ${schedule.venue.address}`}
                                </span>
                              </div>
                            )}
                            {schedule.eventType === 'GAME' && (schedule.homeTeam || schedule.awayTeam) && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>
                                  {schedule.homeTeam?.name || 'TBD'} vs {schedule.awayTeam?.name || 'TBD'}
                                </span>
                              </div>
                            )}
                            {schedule.eventType === 'PRACTICE' && schedule.practiceTeam && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>{schedule.practiceTeam.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
