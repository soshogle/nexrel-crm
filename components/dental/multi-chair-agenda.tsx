/**
 * Multi-Chair Agenda Component
 * Enhanced calendar view with multiple chairs/columns for dental practice
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, User, Plus, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, addHours, setHours, setMinutes, isSameDay, isToday, addDays, subDays } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from '@dnd-kit/core';

interface Appointment {
  id: string;
  customerName: string;
  appointmentDate: string;
  duration: number;
  status: string;
  chairId?: string;
  appointmentType?: string;
  notes?: string;
}

interface Chair {
  id: string;
  name: string;
  color: string;
}

interface MultiChairAgendaProps {
  userId: string;
  selectedDate?: Date;
  onAppointmentUpdated?: () => void;
}

const DEFAULT_CHAIRS: Chair[] = [
  { id: 'chair-1', name: 'Chair 1', color: 'bg-blue-100 border-blue-300' },
  { id: 'chair-2', name: 'Chair 2', color: 'bg-green-100 border-green-300' },
  { id: 'chair-3', name: 'Chair 3', color: 'bg-purple-100 border-purple-300' },
  { id: 'chair-4', name: 'Chair 4', color: 'bg-orange-100 border-orange-300' },
];

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => i + 8); // 8 AM to 11 PM

export function MultiChairAgenda({ userId, selectedDate, onAppointmentUpdated }: MultiChairAgendaProps) {
  const t = useTranslations('dental.multiChair');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const [chairs, setChairs] = useState<Chair[]>(DEFAULT_CHAIRS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date());
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    fetchAppointments();
  }, [userId, currentDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const startOfSelectedDay = startOfDay(currentDate);
      const endOfSelectedDay = addDays(startOfSelectedDay, viewMode === 'day' ? 1 : 7);

      const response = await fetch(
        `/api/appointments?startDate=${startOfSelectedDay.toISOString()}&endDate=${endOfSelectedDay.toISOString()}`
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAppointments(data.map((apt: any) => ({
          id: apt.id,
          customerName: apt.customerName || apt.lead?.contactPerson || 'Unknown',
          appointmentDate: apt.appointmentDate || apt.startTime,
          duration: apt.duration || 30,
          status: apt.status,
          chairId: (apt.customerResponses && typeof apt.customerResponses === 'object' && !Array.isArray(apt.customerResponses) && (apt.customerResponses as any).chairId) 
            ? (apt.customerResponses as any).chairId 
            : null,
          appointmentType: apt.appointmentType?.name || 'General',
          notes: apt.notes,
        })));
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error(tToasts('appointmentsLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const appointmentId = active.id as string;
    const targetChairId = over.id as string;

    if (targetChairId.startsWith('chair-')) {
      try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: { chairId: targetChairId },
          }),
        });

        if (response.ok) {
          const chairName = chairs.find(c => c.id === targetChairId)?.name || targetChairId;
          toast.success(t('appointmentMoved', { chair: chairName }));
          await fetchAppointments();
          onAppointmentUpdated?.();
        }
      } catch (error: any) {
        toast.error(tToasts('appointmentsLoadFailed') + ': ' + error.message);
      }
    }

    setActiveAppointment(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const appointment = appointments.find(apt => apt.id === event.active.id);
    setActiveAppointment(appointment || null);
  };

  const getAppointmentsForChair = (chairId: string, timeSlot: number) => {
    return appointments.filter(apt => {
      if (apt.chairId !== chairId) return false;
      const aptDate = new Date(apt.appointmentDate);
      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();
      const slotStart = timeSlot;
      const slotEnd = timeSlot + 1;
      
      return aptHour >= slotStart && aptHour < slotEnd;
    });
  };

  const getAppointmentPosition = (appointment: Appointment) => {
    const aptDate = new Date(appointment.appointmentDate);
    const startHour = aptDate.getHours();
    const startMinute = aptDate.getMinutes();
    const top = (startHour - 8) * 60 + startMinute; // 8 AM is 0
    const height = appointment.duration;
    return { top: `${top}px`, height: `${height}px` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500';
      case 'IN_PROGRESS':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-gray-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'prev' ? subDays(prev, 7) : addDays(prev, 7));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select value={viewMode} onValueChange={(value: 'day' | 'week') => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t('day')}</SelectItem>
                <SelectItem value="week">{t('week')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${chairs.length + 1}, minmax(200px, 1fr))` }}>
              {/* Time Column */}
              <div className="sticky left-0 bg-white z-10 border-r">
                <div className="h-16 border-b font-semibold text-center flex items-center justify-center">
                  {tCommon('time') || 'Time'}
                </div>
                {TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b flex items-center justify-end pr-4 text-sm text-gray-600"
                  >
                    {format(setHours(new Date(), hour), 'h:mm a')}
                  </div>
                ))}
              </div>

              {/* Chair Columns */}
              {chairs.map((chair) => (
                <div
                  key={chair.id}
                  className={`border rounded-lg ${chair.color} min-h-[800px]`}
                  id={chair.id}
                >
                  <div className="h-16 border-b font-semibold text-center flex items-center justify-center bg-white/50">
                    {chair.name}
                  </div>
                  <div className="relative">
                    {TIME_SLOTS.map((hour) => {
                      const slotAppointments = getAppointmentsForChair(chair.id, hour);
                      return (
                        <div
                          key={hour}
                          className="h-16 border-b relative"
                          style={{ minHeight: '60px' }}
                        >
                          {slotAppointments.map((apt) => {
                            const position = getAppointmentPosition(apt);
                            return (
                              <div
                                key={apt.id}
                                draggable
                                className={`absolute left-1 right-1 rounded p-2 text-white text-xs cursor-move ${getStatusColor(apt.status)}`}
                                style={{
                                  top: position.top,
                                  height: `${apt.duration}px`,
                                  minHeight: '40px',
                                }}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  <GripVertical className="h-3 w-3" />
                                  <Clock className="h-3 w-3" />
                                  <span className="font-semibold">
                                    {format(new Date(apt.appointmentDate), 'h:mm a')}
                                  </span>
                                </div>
                                <div className="font-semibold truncate">{apt.customerName}</div>
                                {apt.appointmentType && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {apt.appointmentType}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeAppointment && (
              <div className={`p-3 rounded text-white text-sm ${getStatusColor(activeAppointment.status)}`}>
                <div className="font-semibold">{activeAppointment.customerName}</div>
                <div className="text-xs">
                  {format(new Date(activeAppointment.appointmentDate), 'h:mm a')}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <span className="text-sm font-semibold">{t('status') || tCommon('status')}:</span>
          <Badge className="bg-blue-500">{tCommon('scheduled') || 'Scheduled'}</Badge>
          <Badge className="bg-green-500">{t('checkedIn') || 'Checked In'}</Badge>
          <Badge className="bg-yellow-500">{tCommon('inProgress') || 'In Progress'}</Badge>
          <Badge className="bg-gray-500">{tCommon('completed') || 'Completed'}</Badge>
          <Badge className="bg-red-500">{tCommon('cancelled') || 'Cancelled'}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
