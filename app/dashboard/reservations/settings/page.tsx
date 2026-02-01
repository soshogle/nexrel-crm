
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ReservationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reservations/settings');
      
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/reservations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/reservations">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Reservations
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Reservation Settings</h1>
        <p className="text-muted-foreground">
          Configure your reservation policies and preferences
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Basic reservation configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="acceptReservations">Accept Reservations</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable online reservations
              </p>
            </div>
            <Switch
              id="acceptReservations"
              checked={settings?.acceptReservations || false}
              onCheckedChange={(checked) => updateSetting('acceptReservations', checked)}
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minAdvanceHours">Minimum Advance Hours</Label>
              <Input
                id="minAdvanceHours"
                type="number"
                value={settings?.minAdvanceHours || 2}
                onChange={(e) => updateSetting('minAdvanceHours', parseInt(e.target.value))}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Minimum hours in advance required for booking
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAdvanceDays">Maximum Advance Days</Label>
              <Input
                id="maxAdvanceDays"
                type="number"
                value={settings?.maxAdvanceDays || 90}
                onChange={(e) => updateSetting('maxAdvanceDays', parseInt(e.target.value))}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Maximum days in advance customers can book
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Slot Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Time Slot Configuration</CardTitle>
          <CardDescription>
            Configure available booking time slots
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
              <Input
                id="slotDuration"
                type="number"
                value={settings?.slotDuration || 30}
                onChange={(e) => updateSetting('slotDuration', parseInt(e.target.value))}
                min="15"
                step="15"
              />
              <p className="text-xs text-muted-foreground">
                Duration of each time slot
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bufferBetweenSlots">Buffer Time (minutes)</Label>
              <Input
                id="bufferBetweenSlots"
                type="number"
                value={settings?.bufferBetweenSlots || 15}
                onChange={(e) => updateSetting('bufferBetweenSlots', parseInt(e.target.value))}
                min="0"
                step="5"
              />
              <p className="text-xs text-muted-foreground">
                Buffer between reservations for table turnover
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit & Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit & Payment</CardTitle>
          <CardDescription>
            Configure deposit requirements for reservations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="requireDeposit">Require Deposit</Label>
              <p className="text-sm text-muted-foreground">
                Require deposit for reservations
              </p>
            </div>
            <Switch
              id="requireDeposit"
              checked={settings?.requireDeposit || false}
              onCheckedChange={(checked) => updateSetting('requireDeposit', checked)}
            />
          </div>

          {settings?.requireDeposit && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={settings?.depositAmount || 0}
                    onChange={(e) => updateSetting('depositAmount', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositMinPartySize">Min Party Size for Deposit</Label>
                  <Input
                    id="depositMinPartySize"
                    type="number"
                    value={settings?.depositMinPartySize || 6}
                    onChange={(e) => updateSetting('depositMinPartySize', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Policy</CardTitle>
          <CardDescription>
            Configure your cancellation requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cancellationHours">Cancellation Notice (hours)</Label>
            <Input
              id="cancellationHours"
              type="number"
              value={settings?.cancellationHours || 24}
              onChange={(e) => updateSetting('cancellationHours', parseInt(e.target.value))}
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Hours before reservation when cancellation is allowed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
          <CardDescription>
            Automated reminder notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sendReminders">Send Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send reservation reminders
              </p>
            </div>
            <Switch
              id="sendReminders"
              checked={settings?.sendReminders || false}
              onCheckedChange={(checked) => updateSetting('sendReminders', checked)}
            />
          </div>

          {settings?.sendReminders && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="reminderHoursBefore">Reminder Time (hours before)</Label>
                <Input
                  id="reminderHoursBefore"
                  type="number"
                  value={settings?.reminderHoursBefore || 24}
                  onChange={(e) => updateSetting('reminderHoursBefore', parseInt(e.target.value))}
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Send reminders this many hours before reservation
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Capacity Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Settings</CardTitle>
          <CardDescription>
            Manage maximum party sizes and overbooking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="maxPartySizeOnline">Max Party Size (Online Booking)</Label>
            <Input
              id="maxPartySizeOnline"
              type="number"
              value={settings?.maxPartySizeOnline || 8}
              onChange={(e) => updateSetting('maxPartySizeOnline', parseInt(e.target.value))}
              min="1"
            />
            <p className="text-xs text-muted-foreground">
              Maximum party size for online reservations
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowOverbooking">Allow Overbooking</Label>
              <p className="text-sm text-muted-foreground">
                Allow booking beyond available capacity
              </p>
            </div>
            <Switch
              id="allowOverbooking"
              checked={settings?.allowOverbooking || false}
              onCheckedChange={(checked) => updateSetting('allowOverbooking', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice AI Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Voice AI Integration</CardTitle>
          <CardDescription>
            Enable voice-based reservation booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableVoiceBooking">Enable Voice Booking</Label>
              <p className="text-sm text-muted-foreground">
                Allow reservations via voice AI agent
              </p>
            </div>
            <Switch
              id="enableVoiceBooking"
              checked={settings?.enableVoiceBooking || false}
              onCheckedChange={(checked) => updateSetting('enableVoiceBooking', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
