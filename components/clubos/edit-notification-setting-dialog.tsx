
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Mail, MessageSquare, Settings as SettingsIcon, Clock } from 'lucide-react';

interface NotificationSetting {
  id: string;
  notificationType: string;
  enabled: boolean;
  sendEmail: boolean;
  sendSMS: boolean;
  reminderHoursBefore?: number | null;
  reminderDaysInterval?: number | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  smsTemplate?: string | null;
}

interface EditNotificationSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting: NotificationSetting | null;
  onSettingUpdated: () => void;
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  REGISTRATION_CONFIRMATION: 'Registration Confirmation',
  PAYMENT_CONFIRMATION: 'Payment Confirmation',
  SCHEDULE_UPDATE: 'Schedule Updates',
  SCHEDULE_REMINDER: 'Schedule Reminders',
  BALANCE_REMINDER: 'Balance Reminders',
  REGISTRATION_APPROVED: 'Registration Approved',
  REGISTRATION_WAITLIST: 'Waitlist Notification',
  TEAM_ASSIGNMENT: 'Team Assignment',
};

const NOTIFICATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  REGISTRATION_CONFIRMATION: 'Sent immediately when a family completes registration',
  PAYMENT_CONFIRMATION: 'Sent when a payment is successfully processed',
  SCHEDULE_UPDATE: 'Sent when new schedules are created or updated',
  SCHEDULE_REMINDER: 'Sent before upcoming games and practices',
  BALANCE_REMINDER: 'Sent to families with outstanding balances',
  REGISTRATION_APPROVED: 'Sent when a registration is approved by admin',
  REGISTRATION_WAITLIST: 'Sent when a member is added to a waitlist',
  TEAM_ASSIGNMENT: 'Sent when a member is assigned to a team',
};

const AVAILABLE_VARIABLES: Record<string, string[]> = {
  REGISTRATION_CONFIRMATION: ['{parentName}', '{childName}', '{programName}', '{divisionName}', '{totalAmount}', '{amountPaid}', '{balanceDue}', '{businessName}'],
  PAYMENT_CONFIRMATION: ['{parentName}', '{childName}', '{amount}', '{paidDate}', '{paymentMethod}', '{receiptUrl}', '{totalAmount}', '{amountPaid}', '{balanceRemaining}', '{businessName}'],
  SCHEDULE_UPDATE: ['{parentName}', '{eventTitle}', '{eventType}', '{eventDate}', '{eventTime}', '{venueName}', '{venueAddress}', '{businessName}'],
  SCHEDULE_REMINDER: ['{parentName}', '{eventTitle}', '{eventType}', '{eventDate}', '{eventTime}', '{venueName}', '{venueAddress}', '{businessName}'],
  BALANCE_REMINDER: ['{parentName}', '{childName}', '{programName}', '{totalAmount}', '{amountPaid}', '{balanceDue}', '{dueDate}', '{businessName}'],
  REGISTRATION_APPROVED: ['{parentName}', '{childName}', '{programName}', '{divisionName}', '{teamName}', '{jerseyNumber}', '{businessName}'],
  REGISTRATION_WAITLIST: ['{parentName}', '{childName}', '{programName}', '{waitlistPosition}', '{businessName}'],
  TEAM_ASSIGNMENT: ['{parentName}', '{childName}', '{teamName}', '{divisionName}', '{jerseyNumber}', '{coachName}', '{practiceDay}', '{practiceTime}', '{seasonStartDate}', '{businessName}'],
};

export default function EditNotificationSettingDialog({
  open,
  onOpenChange,
  setting,
  onSettingUpdated,
}: EditNotificationSettingDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<NotificationSetting>>({});

  useEffect(() => {
    if (setting) {
      setFormData({
        enabled: setting.enabled,
        sendEmail: setting.sendEmail,
        sendSMS: setting.sendSMS,
        reminderHoursBefore: setting.reminderHoursBefore,
        reminderDaysInterval: setting.reminderDaysInterval,
        emailSubject: setting.emailSubject || '',
        emailBody: setting.emailBody || '',
        smsTemplate: setting.smsTemplate || '',
      });
    }
  }, [setting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setting) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/clubos/communications/settings/${setting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update setting');
      }

      toast.success('Notification setting updated successfully');
      onSettingUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating notification setting:', error);
      toast.error(error.message || 'Failed to update setting');
    } finally {
      setIsSaving(false);
    }
  };

  if (!setting) return null;

  const availableVariables = AVAILABLE_VARIABLES[setting.notificationType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {NOTIFICATION_TYPE_LABELS[setting.notificationType] || setting.notificationType}
          </DialogTitle>
          <DialogDescription>
            {NOTIFICATION_TYPE_DESCRIPTIONS[setting.notificationType] || 'Configure notification settings'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">General Settings</h3>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable this notification</Label>
                <p className="text-sm text-muted-foreground">
                  Turn this notification on or off completely
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled || false}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="sendEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications
                </p>
              </div>
              <Switch
                id="sendEmail"
                checked={formData.sendEmail || false}
                onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="sendSMS" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Send SMS
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send text message notifications
                </p>
              </div>
              <Switch
                id="sendSMS"
                checked={formData.sendSMS || false}
                onCheckedChange={(checked) => setFormData({ ...formData, sendSMS: checked })}
              />
            </div>

            {/* Timing Settings */}
            {(setting.notificationType === 'SCHEDULE_REMINDER' || setting.notificationType === 'BALANCE_REMINDER') && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timing Settings
                </h4>
                
                {setting.notificationType === 'SCHEDULE_REMINDER' && (
                  <div className="space-y-2">
                    <Label htmlFor="reminderHoursBefore">
                      Send reminder (hours before event)
                    </Label>
                    <Input
                      id="reminderHoursBefore"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.reminderHoursBefore || 24}
                      onChange={(e) => setFormData({ ...formData, reminderHoursBefore: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: 24 hours. Maximum: 168 hours (7 days)
                    </p>
                  </div>
                )}

                {setting.notificationType === 'BALANCE_REMINDER' && (
                  <div className="space-y-2">
                    <Label htmlFor="reminderDaysInterval">
                      Send reminder every (days)
                    </Label>
                    <Input
                      id="reminderDaysInterval"
                      type="number"
                      min="1"
                      max="30"
                      value={formData.reminderDaysInterval || 7}
                      onChange={(e) => setFormData({ ...formData, reminderDaysInterval: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: 7 days. Maximum: 30 days
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email & SMS Templates */}
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">Email Template</TabsTrigger>
              <TabsTrigger value="sms">SMS Template</TabsTrigger>
              <TabsTrigger value="variables">Available Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailSubject">Email Subject</Label>
                <Input
                  id="emailSubject"
                  value={formData.emailSubject || ''}
                  onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                  placeholder="Enter email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailBody">Email Body</Label>
                <Textarea
                  id="emailBody"
                  value={formData.emailBody || ''}
                  onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                  placeholder="Enter email body..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like {availableVariables.slice(0, 3).join(', ')} in your template
                </p>
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smsTemplate">SMS Message</Label>
                <Textarea
                  id="smsTemplate"
                  value={formData.smsTemplate || ''}
                  onChange={(e) => setFormData({ ...formData, smsTemplate: e.target.value })}
                  placeholder="Enter SMS message..."
                  rows={6}
                  className="font-mono text-sm"
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  Character limit: {(formData.smsTemplate || '').length}/160
                </p>
              </div>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-3">Available Variables</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Copy and paste these variables into your email or SMS templates. They will be automatically replaced with actual values when the notification is sent.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableVariables.map((variable) => (
                    <div key={variable} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {variable}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {variable.replace('{', '').replace('}', '').replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
