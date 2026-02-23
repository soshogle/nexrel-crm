
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, Clock, CheckCircle2, Loader2, Phone, Video, MapPin,
  ChevronLeft, ChevronRight, Sparkles, CalendarDays, UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getIndustryBookingConfig } from '@/lib/industry-booking-config';
import type { IndustryBookingConfig, BookingField } from '@/lib/industry-booking-config';

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

const STEP_NUMBERS: Record<Step, number> = { date: 1, time: 2, details: 3, confirmed: 4 };

export default function PublicBookingPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [step, setStep] = useState<Step>('date');
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [bookingConfig, setBookingConfig] = useState<IndustryBookingConfig>(getIndustryBookingConfig(null));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    meetingType: 'PHONE',
    notes: '',
  });

  const [industryFields, setIndustryFields] = useState<Record<string, string>>({});
  const [confirmationData, setConfirmationData] = useState<any>(null);

  useEffect(() => { fetchSettings(); }, [userId]);
  useEffect(() => { if (selectedDate) fetchAvailableSlots(selectedDate); }, [selectedDate]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/booking/${userId}/settings`);
      if (!response.ok) throw new Error('Failed to load booking settings');
      const data = await response.json();
      setSettings(data.settings);
      setIndustry(data.industry || null);
      const config = getIndustryBookingConfig(data.industry);
      setBookingConfig(config);
      if (config.defaultMeetingTypes.length > 0) {
        setFormData(prev => ({ ...prev, meetingType: config.defaultMeetingTypes[0] }));
      }
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

  const handleIndustryFieldChange = (fieldId: string, value: string) => {
    setIndustryFields(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    const requiredMissing = bookingConfig.extraFields
      .filter(f => f.required)
      .find(f => !industryFields[f.id]);
    if (requiredMissing) {
      toast.error(`Please fill in ${requiredMissing.label}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/booking/${userId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          industryFields: Object.keys(industryFields).length > 0 ? industryFields : undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to book ${bookingConfig.bookingNoun.toLowerCase()}`);
      }
      const data = await response.json();
      setConfirmationData(data);
      setStep('confirmed');
      toast.success(`${bookingConfig.bookingNoun} booked successfully!`);
    } catch (error: any) {
      toast.error(error.message || `Failed to book ${bookingConfig.bookingNoun.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const goToPreviousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 flex items-center justify-center animate-pulse shadow-lg shadow-purple-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md bg-gray-900/80 border-purple-500/20 backdrop-blur-xl">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>Booking page not found or is not available.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meetingTypes = settings.allowedMeetingTypes?.length
    ? settings.allowedMeetingTypes
    : bookingConfig.defaultMeetingTypes;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[120px] animate-float" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[50%] h-[50%] rounded-full bg-pink-600/10 blur-[120px] animate-float" style={{ animationDelay: '-10s' }} />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-600/5 blur-[100px] animate-float" style={{ animationDelay: '-5s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto py-8 px-4 sm:py-12 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/30 mb-5">
            <CalendarDays className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {settings.businessName}
          </h1>
          <p className="text-purple-300/60 text-base">
            {settings.businessDescription || bookingConfig.pageDescription}
          </p>
        </div>

        {/* Step Progress */}
        {step !== 'confirmed' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['date', 'time', 'details'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  STEP_NUMBERS[step] > i + 1
                    ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                    : STEP_NUMBERS[step] === i + 1
                    ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50 ring-offset-2 ring-offset-black'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}>
                  {STEP_NUMBERS[step] > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`w-12 sm:w-16 h-0.5 transition-all duration-300 ${
                  STEP_NUMBERS[step] > i + 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-800'
                }`} />}
              </div>
            ))}
          </div>
        )}

        {/* Main Card */}
        <Card className="bg-gray-900/60 border-purple-500/20 backdrop-blur-xl shadow-2xl shadow-purple-900/20">
          <CardHeader className="border-b border-purple-500/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                {step === 'date' && <Calendar className="h-5 w-5 text-purple-400" />}
                {step === 'time' && <Clock className="h-5 w-5 text-purple-400" />}
                {step === 'details' && <UserCircle className="h-5 w-5 text-purple-400" />}
                {step === 'confirmed' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
              </div>
              <div>
                <CardTitle className="text-white text-lg">
                  {step === 'date' && 'Select a Date'}
                  {step === 'time' && 'Select a Time'}
                  {step === 'details' && 'Your Information'}
                  {step === 'confirmed' && bookingConfig.confirmationTitle}
                </CardTitle>
                {step !== 'confirmed' && (
                  <CardDescription className="text-purple-300/50 text-sm">
                    {step === 'date' && `Choose a day for your ${bookingConfig.bookingNoun.toLowerCase()}`}
                    {step === 'time' && `Available times for ${selectedDate && format(selectedDate, 'MMMM d, yyyy')}`}
                    {step === 'details' && 'Please provide your contact information'}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* ── Date Selection ─── */}
            {step === 'date' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPreviousMonth}
                    disabled={isBefore(currentMonth, startOfMonth(new Date()))}
                    className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/40 h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-semibold text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextMonth}
                    className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/40 h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-purple-300/50 py-2">{day}</div>
                  ))}
                  {eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map((day) => {
                    const isPast = isBefore(day, startOfDay(new Date()));
                    const isCurrent = isToday(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    return (
                      <button
                        key={day.toISOString()}
                        className={`
                          h-11 rounded-lg text-sm font-medium transition-all duration-200
                          ${!isCurrentMonth ? 'opacity-20 cursor-default' : ''}
                          ${isPast ? 'opacity-30 cursor-not-allowed' : ''}
                          ${!isPast && isCurrentMonth ? 'hover:bg-purple-500/20 hover:text-purple-300 hover:shadow-md hover:shadow-purple-500/10 cursor-pointer' : ''}
                          ${isCurrent ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/40 font-bold' : 'text-gray-300 bg-gray-800/40 border border-gray-700/40'}
                        `}
                        onClick={() => !isPast && isCurrentMonth && handleDateSelect(day)}
                        disabled={isPast || !isCurrentMonth}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Time Selection ─── */}
            {step === 'time' && (
              <div className="space-y-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('date')}
                  className="text-purple-300/70 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to Date
                </Button>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Clock className="h-10 w-10 text-purple-400/40 mx-auto" />
                    <p className="text-purple-300/50">No available time slots for this date.</p>
                    <Button variant="outline" size="sm" onClick={() => setStep('date')} className="border-purple-500/20 text-purple-300">
                      Pick another date
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => handleTimeSelect(slot)}
                        className={`
                          h-11 rounded-lg text-sm font-medium transition-all duration-200 border
                          ${selectedTime === slot
                            ? 'bg-gradient-to-r from-purple-600 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/30'
                            : 'bg-gray-800/40 border-gray-700/40 text-gray-300 hover:bg-purple-500/15 hover:border-purple-500/30 hover:text-purple-300'
                          }
                        `}
                      >
                        <Clock className="h-3 w-3 inline mr-1.5 opacity-70" />{slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Details Form ─── */}
            {step === 'details' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('time')}
                  className="text-purple-300/70 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to Time
                </Button>

                {/* Summary banner */}
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
                  <h4 className="font-semibold text-purple-200 mb-2 text-sm">{bookingConfig.bookingNoun} Summary</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-purple-300/70">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-purple-400" />{selectedDate && format(selectedDate, 'MMMM d, yyyy')}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-purple-400" />{selectedTime} ({settings.slotDuration} min)</span>
                  </div>
                </div>

                {/* Contact fields */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-purple-200 text-sm">Full Name *</Label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      placeholder="John Doe"
                      className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <Label className="text-purple-200 text-sm">Email Address *</Label>
                    <Input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      required
                      placeholder="john@example.com"
                      className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <Label className="text-purple-200 text-sm">Phone Number</Label>
                    <Input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                    />
                  </div>

                  {/* Meeting type */}
                  {meetingTypes.length > 1 && (
                    <div>
                      <Label className="text-purple-200 text-sm">Meeting Type</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1.5">
                        {meetingTypes.includes('PHONE') && (
                          <button type="button" onClick={() => setFormData({ ...formData, meetingType: 'PHONE' })}
                            className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-medium border transition-all ${
                              formData.meetingType === 'PHONE'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/30'
                                : 'bg-gray-800/40 border-gray-700/40 text-gray-300 hover:bg-purple-500/10'
                            }`}>
                            <Phone className="h-3.5 w-3.5" /> Phone
                          </button>
                        )}
                        {meetingTypes.includes('VIDEO') && (
                          <button type="button" onClick={() => setFormData({ ...formData, meetingType: 'VIDEO' })}
                            className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-medium border transition-all ${
                              formData.meetingType === 'VIDEO'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/30'
                                : 'bg-gray-800/40 border-gray-700/40 text-gray-300 hover:bg-purple-500/10'
                            }`}>
                            <Video className="h-3.5 w-3.5" /> Video
                          </button>
                        )}
                        {meetingTypes.includes('IN_PERSON') && (
                          <button type="button" onClick={() => setFormData({ ...formData, meetingType: 'IN_PERSON' })}
                            className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-medium border transition-all ${
                              formData.meetingType === 'IN_PERSON'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/30'
                                : 'bg-gray-800/40 border-gray-700/40 text-gray-300 hover:bg-purple-500/10'
                            }`}>
                            <MapPin className="h-3.5 w-3.5" /> In Person
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Industry-specific fields */}
                  {bookingConfig.extraFields.map((field) => (
                    <IndustryFieldRenderer
                      key={field.id}
                      field={field}
                      value={industryFields[field.id] || ''}
                      onChange={(val) => handleIndustryFieldChange(field.id, val)}
                    />
                  ))}
                </div>

                {settings.customMessage && (
                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-3 text-sm text-purple-300/70">
                    {settings.customMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold shadow-lg shadow-purple-500/30 transition-all"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Confirm {bookingConfig.bookingNoun}</>
                  )}
                </Button>
              </form>
            )}

            {/* ── Confirmation ─── */}
            {step === 'confirmed' && confirmationData && (
              <div className="text-center space-y-6 py-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-500/30">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{confirmationData.message}</h3>
                  <p className="text-purple-300/50 text-sm">A confirmation email has been sent to {formData.customerEmail}</p>
                </div>

                <div className="rounded-xl bg-gray-800/60 border border-purple-500/15 p-5 text-left space-y-3">
                  <h4 className="font-semibold text-purple-200 text-sm">{bookingConfig.bookingNoun} Details</h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date</span>
                      <span className="text-white font-medium">{selectedDate && format(selectedDate, 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time</span>
                      <span className="text-white font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration</span>
                      <span className="text-white font-medium">{settings.slotDuration} minutes</span>
                    </div>
                    {meetingTypes.length > 1 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Type</span>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{formData.meetingType}</Badge>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Status</span>
                      <Badge className={confirmationData.appointment.status === 'CONFIRMED'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }>
                        {confirmationData.appointment.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-purple-300/40">{bookingConfig.confirmationFooter}</p>

                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/40"
                >
                  {bookingConfig.bookingVerb} Another {bookingConfig.bookingNoun}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-purple-300/30">
          Powered by <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">Nexrel CRM</span>
        </div>
      </div>
    </div>
  );
}

function IndustryFieldRenderer({ field, value, onChange }: { field: BookingField; value: string; onChange: (val: string) => void }) {
  const labelSuffix = field.required ? ' *' : ' (Optional)';
  const inputClass = 'mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20';

  switch (field.type) {
    case 'select':
      return (
        <div>
          <Label className="text-purple-200 text-sm">{field.label}{labelSuffix}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={`${inputClass} mt-1.5`}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-gray-200 focus:bg-purple-500/20 focus:text-white">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'textarea':
      return (
        <div>
          <Label className="text-purple-200 text-sm">{field.label}{labelSuffix}</Label>
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={3} className={inputClass} />
        </div>
      );
    case 'number':
      return (
        <div>
          <Label className="text-purple-200 text-sm">{field.label}{labelSuffix}</Label>
          <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={inputClass} />
        </div>
      );
    default:
      return (
        <div>
          <Label className="text-purple-200 text-sm">{field.label}{labelSuffix}</Label>
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={inputClass} />
        </div>
      );
  }
}
