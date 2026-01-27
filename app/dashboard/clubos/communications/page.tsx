
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, MessageSquare, Send, Users, Calendar, DollarSign, Loader2, Settings, RefreshCw } from 'lucide-react';
import EditNotificationSettingDialog from '@/components/clubos/edit-notification-setting-dialog';

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

const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
  REGISTRATION_CONFIRMATION: 'Users',
  PAYMENT_CONFIRMATION: 'DollarSign',
  SCHEDULE_UPDATE: 'Calendar',
  SCHEDULE_REMINDER: 'Calendar',
  BALANCE_REMINDER: 'DollarSign',
  REGISTRATION_APPROVED: 'Users',
  REGISTRATION_WAITLIST: 'Users',
  TEAM_ASSIGNMENT: 'Users',
};

const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  REGISTRATION_CONFIRMATION: 'bg-green-100 text-green-600',
  PAYMENT_CONFIRMATION: 'bg-blue-100 text-blue-600',
  SCHEDULE_UPDATE: 'bg-purple-100 text-purple-600',
  SCHEDULE_REMINDER: 'bg-purple-100 text-purple-600',
  BALANCE_REMINDER: 'bg-orange-100 text-orange-600',
  REGISTRATION_APPROVED: 'bg-green-100 text-green-600',
  REGISTRATION_WAITLIST: 'bg-yellow-100 text-yellow-600',
  TEAM_ASSIGNMENT: 'bg-indigo-100 text-indigo-600',
};

export default function ClubOSCommunicationsPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [editingSetting, setEditingSetting] = useState<NotificationSetting | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch('/api/clubos/communications/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }
      const data = await response.json();
      setNotificationSettings(data.settings || []);
    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleEditSetting = (setting: NotificationSetting) => {
    setEditingSetting(setting);
    setIsEditDialogOpen(true);
  };

  const handleSettingUpdated = () => {
    fetchNotificationSettings();
  };

  const sendBulkNotification = async (type: string) => {
    setIsLoading(type);
    try {
      const response = await fetch('/api/clubos/communications/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send notifications');
      }

      const data = await response.json();
      toast.success(`Sent ${data.sent} notifications successfully!`);
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast.error(error.message || 'Failed to send notifications');
    } finally {
      setIsLoading(null);
    }
  };

  const getIconComponent = (notificationType: string) => {
    switch (NOTIFICATION_TYPE_ICONS[notificationType]) {
      case 'Users':
        return <Users className="h-5 w-5" />;
      case 'DollarSign':
        return <DollarSign className="h-5 w-5" />;
      case 'Calendar':
        return <Calendar className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Communications</h1>
        <p className="text-muted-foreground">
          Send notifications and manage communication with families
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registration Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Auto-sent</div>
            <p className="text-xs text-muted-foreground">
              On registration completion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Confirmations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Auto-sent</div>
            <p className="text-xs text-muted-foreground">
              On payment success
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schedule Reminders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manual</div>
            <p className="text-xs text-muted-foreground">
              Send bulk reminders
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bulk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bulk">Bulk Notifications</TabsTrigger>
          <TabsTrigger value="automatic">Automatic Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Bulk Notifications</CardTitle>
              <CardDescription>
                Send notifications to multiple families at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">Schedule Reminders</CardTitle>
                    </div>
                    <CardDescription>
                      Send reminders for tomorrow's games and practices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => sendBulkNotification('schedule_reminders')}
                      disabled={!!isLoading}
                      className="w-full"
                    >
                      {isLoading === 'schedule_reminders' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Reminders
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-orange-500" />
                      <CardTitle className="text-lg">Balance Reminders</CardTitle>
                    </div>
                    <CardDescription>
                      Send reminders to families with outstanding balances
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => sendBulkNotification('balance_reminders')}
                      disabled={!!isLoading}
                      className="w-full"
                      variant="outline"
                    >
                      {isLoading === 'balance_reminders' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Reminders
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automatic" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Automatic Notifications</CardTitle>
                <CardDescription>
                  Configure notifications sent automatically when events occur
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotificationSettings}
                disabled={isLoadingSettings}
              >
                {isLoadingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : notificationSettings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notification settings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notificationSettings.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleEditSetting(setting)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${NOTIFICATION_TYPE_COLORS[setting.notificationType] || 'bg-gray-100'}`}>
                          {getIconComponent(setting.notificationType)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {NOTIFICATION_TYPE_LABELS[setting.notificationType] || setting.notificationType}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {NOTIFICATION_TYPE_DESCRIPTIONS[setting.notificationType] || 'Automatic notification'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {setting.sendEmail && <Badge variant="outline">Email</Badge>}
                            {setting.sendSMS && <Badge variant="outline">SMS</Badge>}
                            {setting.reminderHoursBefore && (
                              <Badge variant="outline">
                                {setting.reminderHoursBefore}h before
                              </Badge>
                            )}
                            {setting.reminderDaysInterval && (
                              <Badge variant="outline">
                                Every {setting.reminderDaysInterval} days
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={setting.enabled ? 'bg-green-500' : 'bg-gray-400'}>
                          {setting.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSetting(setting);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Edit Dialog */}
      <EditNotificationSettingDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        setting={editingSetting}
        onSettingUpdated={handleSettingUpdated}
      />

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Communication Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-900">
            <li>• Schedule reminders are sent 24 hours before events</li>
            <li>• Balance reminders should be sent weekly for outstanding payments</li>
            <li>• All notifications include unsubscribe links for SMS</li>
            <li>• Email templates include direct links to payment pages</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
