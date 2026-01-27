
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, Trash2 } from 'lucide-react';

interface ScheduleListViewProps {
  schedules: any[];
  onScheduleUpdated?: () => void;
  onScheduleDeleted?: (id: string) => void;
}

export function ScheduleListView({ schedules, onScheduleUpdated, onScheduleDeleted }: ScheduleListViewProps) {
  const getEventTypeBadge = (eventType: string) => {
    const variants: Record<string, any> = {
      GAME: 'default',
      PRACTICE: 'secondary',
      TOURNAMENT: 'destructive',
      TRYOUT: 'outline',
      MEETING: 'outline',
    };
    return variants[eventType] || 'outline';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      SCHEDULED: 'default',
      IN_PROGRESS: 'secondary',
      COMPLETED: 'outline',
      POSTPONED: 'destructive',
      CANCELLED: 'destructive',
    };
    return variants[status] || 'outline';
  };

  const sortedSchedules = [...schedules].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule List ({schedules.length} events)</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedSchedules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled events found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="border rounded-lg p-4 hover:bg-accent transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{schedule.title}</h3>
                      <Badge variant={getEventTypeBadge(schedule.eventType)}>
                        {schedule.eventType}
                      </Badge>
                      <Badge variant={getStatusBadge(schedule.status)}>
                        {schedule.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(schedule.startTime), 'PPP p')} -{' '}
                          {format(new Date(schedule.endTime), 'p')}
                        </span>
                      </div>

                      {schedule.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{schedule.venue.name}</span>
                        </div>
                      )}

                      {(schedule.homeTeam || schedule.practiceTeam) && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>
                            {schedule.homeTeam && schedule.awayTeam
                              ? `${schedule.homeTeam.name} vs ${schedule.awayTeam.name}`
                              : schedule.practiceTeam
                              ? `${schedule.practiceTeam.name} Practice`
                              : 'No teams assigned'}
                          </span>
                        </div>
                      )}
                    </div>

                    {schedule.description && (
                      <p className="mt-2 text-sm">{schedule.description}</p>
                    )}
                  </div>

                  {onScheduleDeleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onScheduleDeleted(schedule.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
