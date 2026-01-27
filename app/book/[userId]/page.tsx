'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, CheckCircle2, Loader2, Phone, Video, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface BookingSettings {
  businessName: string;
  businessDescription?: string;
  slotDuration: number;
  advanceBookingDays: number;
  allowedMeetingTypes?: string[];
  customMessage?: string;
  brandColor?: string;
}

type Step = 'date' | 'time' | 'details' | 'confirmed';

export default function PublicBookingPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [step, setStep] = useState<Step>('date');
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Time slot state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    meetingType: 'PHONE',
    notes: '',
  });

  const [confirmationData, setConfirmationData] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/booking/${userId}/settings`);
      if (!response.ok) throw new Error('Failed to load booking settings');
      const data = await response.json();
      setSettings(data.settings);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load booking page');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date: Date) => {
    setLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/booking/${userId}/availability?date=${dateStr}`);
      if (!response.ok) throw new Error('Failed to load availability');
      const data = await response.json();
      setAvailableSlots(data.availableSlots || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load time slots');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep('time');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/booking/${userId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to book appointment');
      }

      const data = await response.json();
      setConfirmationData(data);
      setStep('confirmed');
      toast.success('Appointment booked successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                Booking page not found or is not available.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandColor = settings.brandColor || '#9333ea';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: brandColor }}>
            {settings.businessName}
          </h1>
          {settings.businessDescription && (
            <p className="text-gray-400 text-lg">{settings.businessDescription}</p>
          )}
        </div>

        {/* Main Card */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              {step === 'date' && <Calendar className="h-5 w-5" style={{ color: brandColor }} />}
              {step === 'time' && <Clock className="h-5 w-5" style={{ color: brandColor }} />}
              {step === 'details' && <Phone className="h-5 w-5" style={{ color: brandColor }} />}
              {step === 'confirmed' && <CheckCircle2 className="h-5 w-5" style={{ color: brandColor }} />}
              <CardTitle>
                {step === 'date' && 'Select a Date'}
                {step === 'time' && 'Select a Time'}
                {step === 'details' && 'Your Information'}
                {step === 'confirmed' && 'Booking Confirmed!'}
              </CardTitle>
            </div>
            {step !== 'confirmed' && (
              <CardDescription>
                {step === 'date' && 'Choose a day for your appointment'}
                {step === 'time' && `Available times for ${selectedDate && format(selectedDate, 'MMMM d, yyyy')}`}
                {step === 'details' && 'Please provide your contact information'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {/* Date Selection Step */}
            {step === 'date' && (
              <div className="space-y-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousMonth}
                    disabled={isBefore(currentMonth, startOfMonth(new Date()))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-semibold">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  ))}
                  {eachDayOfInterval({
                    start: startOfMonth(currentMonth),
                    end: endOfMonth(currentMonth),
                  }).map((day) => {
                    const isPast = isBefore(day, startOfDay(new Date()));
                    const isCurrent = isToday(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <Button
                        key={day.toISOString()}
                        variant="outline"
                        className={`
                          h-12 p-0
                          ${!isCurrentMonth && 'opacity-30'}
                          ${isPast && 'opacity-50 cursor-not-allowed'}
                          ${isCurrent && 'ring-2'}
                        `}
                        style={{
                          ...(isCurrent && { borderColor: brandColor, color: brandColor }),
                        }}
                        onClick={() => handleDateSelect(day)}
                        disabled={isPast || !isCurrentMonth}
                      >
                        {format(day, 'd')}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Time Selection Step */}
            {step === 'time' && (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('date')}
                  className="mb-4"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Date
                </Button>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No available time slots for this date. Please select another date.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant="outline"
                        className="h-12"
                        onClick={() => handleTimeSelect(slot)}
                        style={{
                          ...(selectedTime === slot && {
                            backgroundColor: brandColor,
                            borderColor: brandColor,
                            color: 'white',
                          }),
                        }}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details Form Step */}
            {step === 'details' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('time')}
                  className="mb-4"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Time
                </Button>

                {/* Booking Summary */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold mb-2">Booking Summary</h4>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedTime} ({settings.slotDuration} minutes)
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({ ...formData, customerName: e.target.value })
                      }
                      required
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, customerEmail: e.target.value })
                      }
                      required
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, customerPhone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  {settings.allowedMeetingTypes && settings.allowedMeetingTypes.length > 1 && (
                    <div>
                      <Label>Meeting Type</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {settings.allowedMeetingTypes.includes('PHONE') && (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() =>
                              setFormData({ ...formData, meetingType: 'PHONE' })
                            }
                            style={{
                              ...(formData.meetingType === 'PHONE' && {
                                backgroundColor: brandColor,
                                borderColor: brandColor,
                                color: 'white',
                              }),
                            }}
                          >
                            <Phone className="h-4 w-4" />
                            Phone
                          </Button>
                        )}
                        {settings.allowedMeetingTypes.includes('VIDEO') && (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() =>
                              setFormData({ ...formData, meetingType: 'VIDEO' })
                            }
                            style={{
                              ...(formData.meetingType === 'VIDEO' && {
                                backgroundColor: brandColor,
                                borderColor: brandColor,
                                color: 'white',
                              }),
                            }}
                          >
                            <Video className="h-4 w-4" />
                            Video
                          </Button>
                        )}
                        {settings.allowedMeetingTypes.includes('IN_PERSON') && (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() =>
                              setFormData({ ...formData, meetingType: 'IN_PERSON' })
                            }
                            style={{
                              ...(formData.meetingType === 'IN_PERSON' && {
                                backgroundColor: brandColor,
                                borderColor: brandColor,
                                color: 'white',
                              }),
                            }}
                          >
                            <MapPin className="h-4 w-4" />
                            In Person
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Any special requests or information..."
                      rows={3}
                    />
                  </div>
                </div>

                {settings.customMessage && (
                  <Alert>
                    <AlertDescription>{settings.customMessage}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: brandColor }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
              </form>
            )}

            {/* Confirmation Step */}
            {step === 'confirmed' && confirmationData && (
              <div className="text-center space-y-6">
                <div
                  className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}20` }}
                >
                  <CheckCircle2 className="h-8 w-8" style={{ color: brandColor }} />
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {confirmationData.message}
                  </h3>
                  <p className="text-gray-400">
                    A confirmation email has been sent to {formData.customerEmail}
                  </p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-left">
                  <h4 className="font-semibold mb-4">Appointment Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="font-medium">{settings.slotDuration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <Badge>{formData.meetingType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <Badge
                        style={{
                          backgroundColor:
                            confirmationData.appointment.status === 'CONFIRMED'
                              ? brandColor
                              : undefined,
                        }}
                      >
                        {confirmationData.appointment.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Book Another Appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Powered by Soshogle CRM
        </div>
      </div>
    </div>
  );
}
