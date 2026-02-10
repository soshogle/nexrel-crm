
'use client';

import { format } from 'date-fns';
import { Calendar, MapPin, Video, Phone, User, Clock, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { AppointmentDetailDialog } from './appointment-detail-dialog';
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog';
import type { Appointment } from '@/types/appointment';

interface AppointmentsListProps {
  appointments: Appointment[];
  onAppointmentUpdated: () => void;
  onAppointmentDeleted: () => void;
}

export function AppointmentsList({ appointments, onAppointmentUpdated, onAppointmentDeleted }: AppointmentsListProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [appointmentForCall, setAppointmentForCall] = useState<Appointment | null>(null);

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    CONFIRMED: 'bg-green-500/20 text-green-400 border-green-500/30',
    COMPLETED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    NO_SHOW: 'bg-red-500/20 text-red-400 border-red-500/30',
    CANCELLED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  const meetingTypeIcons: Record<string, any> = {
    IN_PERSON: MapPin,
    VIDEO_CALL: Video,
    PHONE_CALL: Phone,
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailDialog(true);
  };

  const handleMakeCall = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setAppointmentForCall(appointment);
    setCallDialogOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (response.ok) {
        toast.success('Appointment cancelled');
        onAppointmentDeleted();
      } else {
        throw new Error('Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  // Filter out appointments with invalid dates and sort
  const validAppointments = appointments.filter(apt => {
    try {
      const date = new Date(apt.startTime);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  });

  const sortedAppointments = [...validAppointments].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  if (sortedAppointments.length === 0) {
    return (
      <Card className="glass-effect border-purple-500/20">
        <div className="text-center py-12 text-purple-300/50">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-purple-400" />
          <p>No appointments scheduled</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sortedAppointments.map((apt) => {
        const MeetingIcon = meetingTypeIcons[apt.meetingType] || MapPin;
        const startDate = new Date(apt.startTime);
        const isPast = startDate < new Date();

        return (
          <Card
            key={apt.id}
            className={`
              glass-effect border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer
              ${apt.status === 'CANCELLED' ? 'opacity-50' : ''}
            `}
            onClick={() => handleAppointmentClick(apt)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left Section - Icon & Details */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/30">
                      <MeetingIcon className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title & Status */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white truncate">{apt.title}</h3>
                      <Badge className={`${statusColors[apt.status]} border`}>
                        {apt.status.replace('_', ' ')}
                      </Badge>
                      {isPast && apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                        <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {apt.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{apt.description}</p>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {/* Date & Time */}
                      <div className="flex items-center gap-2 text-purple-300/80">
                        <Clock className="h-4 w-4 text-purple-400" />
                        <span>{format(startDate, 'MMM d, yyyy • h:mm a')}</span>
                      </div>

                      {/* Lead/Contact */}
                      {apt.lead && (
                        <div className="flex items-center gap-2 text-purple-300/80">
                          <User className="h-4 w-4 text-purple-400" />
                          <span className="truncate">{apt.lead.contactPerson}</span>
                        </div>
                      )}

                      {/* Location */}
                      {apt.location && apt.meetingType === 'IN_PERSON' && (
                        <div className="flex items-center gap-2 text-purple-300/80">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <span className="truncate">{apt.location}</span>
                        </div>
                      )}

                      {/* Payment Info */}
                      {apt.requiresPayment && apt.paymentAmount && (
                        <div className="flex items-center gap-2 text-purple-300/80">
                          <span className="text-purple-400 font-medium">
                            ${(apt.paymentAmount / 100).toFixed(2)}
                          </span>
                          {apt.payments && apt.payments.length > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {apt.lead?.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleMakeCall(apt, e)}
                      className="hover:bg-purple-500/20 hover:text-purple-400 border border-purple-500/20"
                      title="Make Voice AI Call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAppointment(apt.id)}
                      className="hover:bg-red-500/20 hover:text-red-400 border border-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        open={showDetailDialog}
        onClose={() => {
          setShowDetailDialog(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onUpdate={() => {
          onAppointmentUpdated();
        }}
      />

      {/* Voice AI Call Dialog */}
      <MakeCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        defaultName={appointmentForCall?.lead?.contactPerson || appointmentForCall?.lead?.businessName || ''}
        defaultPhone={appointmentForCall?.lead?.phone || ''}
        defaultPurpose={`Appointment reminder: ${appointmentForCall?.title || ''}`}
        leadId={appointmentForCall?.lead?.id}
      />
    </div>
  );
}
