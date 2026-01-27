'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, Video, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, setHours, setMinutes, getHours, getMinutes } from 'date-fns'
import { AppointmentDetailDialog } from './appointment-detail-dialog'
import { toast } from 'sonner'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Appointment } from '@/types/appointment';

interface CalendarViewProps {
  appointments: Appointment[];
  onDateClick: (date: Date) => void;
  onAppointmentUpdated: () => void;
}

// Draggable Appointment Component
function DraggableAppointment({ appointment, statusColors, meetingTypeIcons, onClick }: any) {
  // Validate appointment data
  if (!appointment || !appointment.id) {
    console.warn('⚠️ Invalid appointment data in DraggableAppointment:', appointment)
    return null
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: appointment,
  })

  // Safely get the meeting icon with fallback
  const meetingType = appointment.meetingType || 'PHONE_CALL'
  const MeetingIcon = meetingTypeIcons[meetingType] || MapPin

  // Safely parse the date with error handling
  let timeText = 'Invalid time'
  try {
    if (appointment.startTime) {
      const appointmentDate = new Date(appointment.startTime)
      if (!isNaN(appointmentDate.getTime())) {
        timeText = format(appointmentDate, 'HH:mm')
      }
    }
  } catch (error) {
    console.error('Error formatting appointment time:', error)
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  // Get the title with fallback
  const title = appointment.title || 'Untitled Appointment'
  
  // Get the status color with fallback
  const statusColor = appointment.status ? statusColors[appointment.status] : statusColors['SCHEDULED']

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        text-xs px-2 py-1 rounded border cursor-move
        ${statusColor || 'bg-blue-500 text-white border-blue-600'}
        ${isDragging ? 'opacity-50' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onClick(appointment)
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <MeetingIcon className="h-3 w-3 flex-shrink-0" />
        <span className="font-semibold truncate">{timeText}</span>
      </div>
      <div className="truncate font-medium">{title}</div>
    </div>
  )
}

// Droppable Day Cell Component
function DroppableDay({ date, children, onDateClick, isCurrentMonth, isTodayDate }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: { date },
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        aspect-square rounded-lg p-2 cursor-pointer transition-all relative
        ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-200'}
        ${isOver ? 'ring-2 ring-purple-400 scale-105' : ''}
      `}
      style={{
        border: isCurrentMonth ? '3px solid transparent' : '2px solid #d1d5db',
        backgroundImage: isCurrentMonth 
          ? 'linear-gradient(white, white), linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 70%, 58%) 50%, hsl(330, 80%, 55%) 100%)'
          : undefined,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }}
      onClick={() => onDateClick(date)}
    >
      {children}
    </div>
  )
}

export function CalendarView({ appointments, onDateClick, onAppointmentUpdated }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Initialize date only on client side
  useEffect(() => {
    setMounted(true)
    setCurrentMonth(new Date())
    
    // Debug: Log all appointments when component mounts
    console.log('📅 Calendar View: Total appointments:', appointments.length)
    appointments.forEach(apt => {
      console.log('  - Appointment:', apt.title, 'Date:', apt.startTime, 'Status:', apt.status)
    })
  }, [appointments])

  const handlePreviousMonth = () => {
    if (!currentMonth) return
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    if (!currentMonth) return
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDetailDialog(true)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const appointment = event.active.data.current as Appointment
    setActiveAppointment(appointment)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveAppointment(null)

    if (!over) return

    const appointment = active.data.current as Appointment
    const targetDateCell = over.data.current

    if (!targetDateCell?.date) return

    const newDate = targetDateCell.date as Date
    const oldStartTime = new Date(appointment.startTime)
    const oldEndTime = new Date(appointment.endTime)

    // Preserve the time but change the date
    const newStartTime = setMinutes(
      setHours(newDate, getHours(oldStartTime)),
      getMinutes(oldStartTime)
    )
    const newEndTime = setMinutes(
      setHours(newDate, getHours(oldEndTime)),
      getMinutes(oldEndTime)
    )

    // Only update if the date actually changed
    if (isSameDay(newStartTime, oldStartTime)) {
      return
    }

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update appointment')
      }

      toast.success(`Appointment moved to ${format(newDate, 'MMMM d, yyyy')}`)
      onAppointmentUpdated()
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to move appointment')
    }
  }

  const getAppointmentsForDate = (date: Date) => {
    // Ensure appointments is an array
    if (!Array.isArray(appointments)) {
      console.warn('⚠️ appointments is not an array:', appointments)
      return []
    }

    const filtered = appointments.filter(apt => {
      try {
        // Validate appointment has required fields
        if (!apt || !apt.startTime || !apt.status) {
          console.warn('⚠️ Appointment missing required fields:', apt)
          return false
        }

        const aptDate = new Date(apt.startTime)
        if (isNaN(aptDate.getTime())) {
          console.warn('⚠️ Invalid date for appointment:', apt.id, apt.startTime)
          return false
        }

        const matches = isSameDay(aptDate, date) && apt.status !== 'CANCELLED'
        
        // Debug logging (removed for performance, only log in dev mode if needed)
        // if (matches) {
        //   console.log('✅ Appointment matched for date:', format(date, 'MMM d, yyyy'), apt.title)
        // }
        
        return matches
      } catch (error) {
        console.error('Error parsing appointment date:', error, apt)
        return false
      }
    })
    
    return filtered
  }

  // Don't render until mounted and date initialized
  if (!mounted || !currentMonth) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Calculate dates only after guard clause to prevent hydration errors
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add padding days to start from Sunday
  const startDayOfWeek = monthStart.getDay()
  const paddingDays = Array(startDayOfWeek).fill(null)

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500 text-white border-blue-600',
    CONFIRMED: 'bg-green-500 text-white border-green-600',
    COMPLETED: 'bg-gray-500 text-white border-gray-600',
    NO_SHOW: 'bg-red-500 text-white border-red-600',
    CANCELLED: 'bg-orange-500 text-white border-orange-600',
  }

  const meetingTypeIcons: Record<string, any> = {
    IN_PERSON: MapPin,
    VIDEO_CALL: Video,
    PHONE_CALL: Phone,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold text-black">{format(currentMonth, 'MMMM yyyy')}</h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card className="p-6 bg-white border-gray-300">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="aspect-square" />
            ))}
            {daysInMonth.map(date => {
              const dayAppointments = getAppointmentsForDate(date)
              const isCurrentMonth = isSameMonth(date, currentMonth)
              const isTodayDate = isToday(date)

              return (
                <DroppableDay
                  key={date.toISOString()}
                  date={date}
                  onDateClick={onDateClick}
                  isCurrentMonth={isCurrentMonth}
                  isTodayDate={isTodayDate}
                >
                  <div className="flex flex-col h-full">
                    <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-purple-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-800'}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {dayAppointments.slice(0, 3).map(apt => (
                        <DraggableAppointment
                          key={apt.id}
                          appointment={apt}
                          statusColors={statusColors}
                          meetingTypeIcons={meetingTypeIcons}
                          onClick={handleAppointmentClick}
                        />
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className={`text-xs px-2 ${isCurrentMonth ? 'text-gray-700' : 'text-gray-600'}`}>
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </DroppableDay>
              )
            })}
          </div>
        </Card>

        {/* Appointment Detail Dialog */}
        <AppointmentDetailDialog
          open={showDetailDialog}
          onClose={() => {
            setShowDetailDialog(false)
            setSelectedAppointment(null)
          }}
          appointment={selectedAppointment}
          onUpdate={() => {
            onAppointmentUpdated()
          }}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment ? (
          <div
            className={`
              text-xs px-2 py-1 rounded border opacity-90 shadow-lg
              ${statusColors[activeAppointment.status] || 'bg-muted text-foreground'}
            `}
          >
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{activeAppointment.title}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
