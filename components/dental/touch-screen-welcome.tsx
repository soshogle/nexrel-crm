/**
 * Touch-Screen Welcome System Component
 * Check-in kiosk interface for patient welcome and queue management
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { User, Clock, CheckCircle2, AlertCircle, Phone, Mail, Calendar } from 'lucide-react';

interface Appointment {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  appointmentDate: string;
  status: string;
  duration: number;
}

interface TouchScreenWelcomeProps {
  userId: string;
  onCheckIn?: (appointmentId: string) => void;
}

export function TouchScreenWelcome({ userId, onCheckIn }: TouchScreenWelcomeProps) {
  const t = useTranslations('dental.touchScreen');
  const tToasts = useTranslations('dental.toasts');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayAppointments();
  }, [userId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = appointments.filter(apt =>
        apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.customerPhone?.includes(searchQuery)
      );
      setFilteredAppointments(filtered);
    } else {
      setFilteredAppointments(appointments);
    }
  }, [searchQuery, appointments]);

  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await fetch(
        `/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAppointments(data.map((apt: any) => ({
          id: apt.id,
          customerName: apt.customerName || apt.lead?.contactPerson || 'Unknown',
          customerEmail: apt.customerEmail || apt.lead?.email,
          customerPhone: apt.customerPhone || apt.lead?.phone,
          appointmentDate: apt.appointmentDate || apt.startTime,
          status: apt.status,
          duration: apt.duration || 30,
        })));
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error(tToasts('appointmentsLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
        }),
      });

      if (response.ok) {
        toast.success(tToasts('checkInSuccess'));
        setCheckedIn(true);
        setSelectedAppointment(null);
        await fetchTodayAppointments();
        onCheckIn?.(appointmentId);
      } else {
        toast.error(tToasts('checkInFailed'));
      }
    } catch (error: any) {
      toast.error(tToasts('checkInFailed') + ': ' + error.message);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return t('invalidTime');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <Card className="max-w-6xl mx-auto shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-4xl font-bold mb-2">{t('title')}</CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                {t('subtitle')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="text-2xl h-16 px-6"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">{t('loadingAppointments')}</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600">{t('noAppointments')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAppointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedAppointment?.id === appointment.id
                      ? 'ring-4 ring-purple-500 bg-purple-50'
                      : ''
                  }`}
                  onClick={() => {
                    if (appointment.status !== 'IN_PROGRESS' && appointment.status !== 'COMPLETED') {
                      setSelectedAppointment(appointment);
                      setCheckedIn(false);
                    }
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                          {appointment.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {appointment.customerName}
                          </h3>
                          {appointment.customerEmail && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              {appointment.customerEmail}
                            </p>
                          )}
                          {appointment.customerPhone && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3" />
                              {appointment.customerPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold">{formatTime(appointment.appointmentDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {new Date(appointment.appointmentDate).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {selectedAppointment?.id === appointment.id && !checkedIn && (
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(appointment.id);
                          }}
                          className="w-full text-lg py-6"
                          size="lg"
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          {t('checkIn')}
                        </Button>
                      </div>
                    )}

                    {appointment.status === 'IN_PROGRESS' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">{t('checkedIn')}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
