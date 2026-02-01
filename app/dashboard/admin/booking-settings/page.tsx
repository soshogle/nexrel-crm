'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Loader2, Link2, Calendar, Clock, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AvailabilitySchedule {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export default function BookingSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    businessDescription: '',
    slotDuration: 30,
    bufferTime: 15,
    advanceBookingDays: 30,
    minNoticeHours: 24,
    requireApproval: false,
    customMessage: '',
    brandColor: '#9333ea',
    allowedMeetingTypes: ['PHONE', 'VIDEO', 'IN_PERSON'],
  });

  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/booking/settings');
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      setSettings(data.settings);

      // Populate form
      if (data.settings) {
        setFormData({
          businessName: data.settings.businessName || '',
          businessDescription: data.settings.businessDescription || '',
          slotDuration: data.settings.slotDuration || 30,
          bufferTime: data.settings.bufferTime || 15,
          advanceBookingDays: data.settings.advanceBookingDays || 30,
          minNoticeHours: data.settings.minNoticeHours || 24,
          requireApproval: data.settings.requireApproval || false,
          customMessage: data.settings.customMessage || '',
          brandColor: data.settings.brandColor || '#9333ea',
          allowedMeetingTypes: data.settings.allowedMeetingTypes || ['PHONE', 'VIDEO', 'IN_PERSON'],
        });

        if (data.settings.availabilitySchedule) {
          setAvailabilitySchedule(data.settings.availabilitySchedule);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/booking/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          availabilitySchedule,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      const data = await response.json();
      setSettings(data.settings);
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyBookingLink = () => {
    if (!session?.user?.id) return;
    const link = `${window.location.origin}/book/${session.user.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Booking link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMeetingType = (type: string) => {
    const current = formData.allowedMeetingTypes;
    if (current.includes(type)) {
      setFormData({
        ...formData,
        allowedMeetingTypes: current.filter((t) => t !== type),
      });
    } else {
      setFormData({
        ...formData,
        allowedMeetingTypes: [...current, type],
      });
    }
  };

  const updateDaySchedule = (day: string, field: 'enabled' | 'start' | 'end', value: any) => {
    setAvailabilitySchedule({
      ...availabilitySchedule,
      [day]: {
        ...availabilitySchedule[day],
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const bookingLink = session?.user?.id
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${session.user.id}`
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Booking Page Settings</h1>
        <p className="text-gray-400 mt-2">
          Configure your public booking page and share it with clients
        </p>
      </div>

      {/* Booking Link Card */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-purple-500" />
            <CardTitle>Your Booking Link</CardTitle>
          </div>
          <CardDescription>
            Share this link with clients to let them book appointments with you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={bookingLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyBookingLink} variant="outline">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-4">
            <Button
              variant="default"
              onClick={() => window.open(bookingLink, '_blank')}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Preview Booking Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Calendar className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Clock className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure your business information and booking preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  placeholder="Your Business Name"
                />
              </div>

              <div>
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  value={formData.businessDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, businessDescription: e.target.value })
                  }
                  placeholder="A brief description of your services..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="customMessage">Custom Message</Label>
                <Textarea
                  id="customMessage"
                  value={formData.customMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, customMessage: e.target.value })
                  }
                  placeholder="Any special instructions for clients..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="brandColor"
                    type="color"
                    value={formData.brandColor}
                    onChange={(e) =>
                      setFormData({ ...formData, brandColor: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.brandColor}
                    onChange={(e) =>
                      setFormData({ ...formData, brandColor: e.target.value })
                    }
                    placeholder="#9333ea"
                  />
                </div>
              </div>

              <div>
                <Label>Allowed Meeting Types</Label>
                <div className="flex gap-2 mt-2">
                  <Badge
                    variant={formData.allowedMeetingTypes.includes('PHONE') ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleMeetingType('PHONE')}
                  >
                    Phone
                  </Badge>
                  <Badge
                    variant={formData.allowedMeetingTypes.includes('VIDEO') ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleMeetingType('VIDEO')}
                  >
                    Video
                  </Badge>
                  <Badge
                    variant={formData.allowedMeetingTypes.includes('IN_PERSON') ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleMeetingType('IN_PERSON')}
                  >
                    In Person
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireApproval">Require Approval</Label>
                  <p className="text-sm text-gray-400">
                    Bookings will be pending until you approve them
                  </p>
                </div>
                <Switch
                  id="requireApproval"
                  checked={formData.requireApproval}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requireApproval: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Settings */}
        <TabsContent value="availability">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Weekly Availability</CardTitle>
              <CardDescription>
                Set your available hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(availabilitySchedule).map(([day, schedule]) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-28">
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(checked) =>
                        updateDaySchedule(day, 'enabled', checked)
                      }
                    />
                    <span className="ml-2 capitalize">{day}</span>
                  </div>
                  {schedule.enabled && (
                    <>
                      <Input
                        type="time"
                        value={schedule.start}
                        onChange={(e) =>
                          updateDaySchedule(day, 'start', e.target.value)
                        }
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={schedule.end}
                        onChange={(e) =>
                          updateDaySchedule(day, 'end', e.target.value)
                        }
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-tune your booking parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="slotDuration">Appointment Duration (minutes)</Label>
                <Input
                  id="slotDuration"
                  type="number"
                  value={formData.slotDuration}
                  onChange={(e) =>
                    setFormData({ ...formData, slotDuration: parseInt(e.target.value) })
                  }
                  min={15}
                  step={15}
                />
              </div>

              <div>
                <Label htmlFor="bufferTime">Buffer Time Between Appointments (minutes)</Label>
                <Input
                  id="bufferTime"
                  type="number"
                  value={formData.bufferTime}
                  onChange={(e) =>
                    setFormData({ ...formData, bufferTime: parseInt(e.target.value) })
                  }
                  min={0}
                  step={5}
                />
              </div>

              <div>
                <Label htmlFor="advanceBookingDays">Maximum Advance Booking (days)</Label>
                <Input
                  id="advanceBookingDays"
                  type="number"
                  value={formData.advanceBookingDays}
                  onChange={(e) =>
                    setFormData({ ...formData, advanceBookingDays: parseInt(e.target.value) })
                  }
                  min={1}
                />
              </div>

              <div>
                <Label htmlFor="minNoticeHours">Minimum Notice Required (hours)</Label>
                <Input
                  id="minNoticeHours"
                  type="number"
                  value={formData.minNoticeHours}
                  onChange={(e) =>
                    setFormData({ ...formData, minNoticeHours: parseInt(e.target.value) })
                  }
                  min={0}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
