
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { Calendar } from 'lucide-react';

interface ScheduleCalendarViewProps {
  schedules: any[];
  onScheduleUpdated?: () => void;
  onScheduleDeleted?: (id: string) => void;
  onEventClick?: (event: any) => void;
  onDateClick?: (date: Date) => void;
}

export function ScheduleCalendarView({ schedules, onScheduleUpdated, onScheduleDeleted, onEventClick, onDateClick }: ScheduleCalendarViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Ensure schedules is always an array
  const safeSchedules = Array.isArray(schedules) ? schedules : [];

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSchedulesForDay = (day: Date) => {
    return safeSchedules.filter((schedule) =>
      isSameDay(new Date(schedule.startTime), day)
    );
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      GAME: 'bg-blue-500',
      PRACTICE: 'bg-green-500',
      TOURNAMENT: 'bg-purple-500',
      TRYOUT: 'bg-orange-500',
      MEETING: 'bg-gray-500',
    };
    return colors[eventType] || 'bg-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {format(today, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day) => {
            const daySchedules = getSchedulesForDay(day);
            const isToday = isSameDay(day, today);
            const hasEvents = daySchedules.length > 0;

            const handleDayClick = (e: React.MouseEvent) => {
              // Only trigger date click if clicking on empty space (not on an event)
              if (!hasEvents && onDateClick && e.target === e.currentTarget) {
                onDateClick(day);
              } else if (!hasEvents && onDateClick) {
                onDateClick(day);
              }
            };

            return (
              <div
                key={day.toISOString()}
                onClick={handleDayClick}
                className={`min-h-24 border rounded-lg p-2 transition-colors ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                } ${!isSameMonth(day, today) ? 'opacity-50' : ''} ${
                  !hasEvents ? 'cursor-pointer hover:bg-gray-50 hover:border-primary/50' : ''
                }`}
                title={!hasEvents ? 'Click to create event' : ''}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {daySchedules.slice(0, 2).map((schedule) => (
                    <div
                      key={schedule.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEventClick) {
                          onEventClick(schedule);
                        }
                      }}
                      className={`text-xs p-1 rounded ${getEventTypeColor(schedule.eventType)} text-white truncate cursor-pointer hover:opacity-80 hover:shadow-md transition-all`}
                      title={`${schedule.title} - Click to view details`}
                    >
                      {format(new Date(schedule.startTime), 'h:mm a')} - {schedule.title}
                    </div>
                  ))}
                  {daySchedules.length > 2 && (
                    <div 
                      className="text-xs text-gray-500 text-center cursor-pointer hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show all events for this day - you could open a list dialog
                        if (onEventClick && daySchedules.length > 0) {
                          onEventClick(daySchedules[2]); // Show the third event
                        }
                      }}
                      title="Click to see more events"
                    >
                      +{daySchedules.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm">Game</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm">Practice</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500"></div>
            <span className="text-sm">Tournament</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-sm">Tryout</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500"></div>
            <span className="text-sm">Meeting</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
