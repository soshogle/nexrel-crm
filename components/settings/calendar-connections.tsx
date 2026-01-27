
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { GoogleCalendarConnect } from '@/components/calendar/google-calendar-connect'
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Mail,
  Apple,
  Link as LinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'

type CalendarProvider = 'GOOGLE' | 'OUTLOOK' | 'OFFICE365' | 'APPLE' | 'EXTERNAL_API'
type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'DISABLED'

interface CalendarConnection {
  id: string
  provider: CalendarProvider
  providerAccountId?: string | null
  calendarId?: string | null
  calendarName?: string | null
  syncEnabled: boolean
  lastSyncAt?: Date | null
  syncStatus: SyncStatus
  webhookUrl?: string | null
  settings?: any
  createdAt: Date
  updatedAt: Date
}

const providerLabels: Record<CalendarProvider, string> = {
  GOOGLE: 'Google Calendar',
  OUTLOOK: 'Outlook Calendar',
  OFFICE365: 'Office 365',
  APPLE: 'Apple Calendar (iCloud)',
  EXTERNAL_API: 'External Booking System',
}

const providerIcons: Record<CalendarProvider, any> = {
  GOOGLE: Calendar,
  OUTLOOK: Mail,
  OFFICE365: Mail,
  APPLE: Apple,
  EXTERNAL_API: LinkIcon,
}

export function CalendarConnections() {
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)

  // Form state
  const [provider, setProvider] = useState<CalendarProvider>('GOOGLE')
  const [calendarName, setCalendarName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [calendarId, setCalendarId] = useState('')

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calendar-connections')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
      toast.error('Failed to load calendar connections')
    } finally {
      setLoading(false)
    }
  }

  const handleAddConnection = async () => {
    if (!calendarName.trim()) {
      toast.error('Please provide a name for this calendar connection')
      return
    }

    if (provider === 'EXTERNAL_API' && !webhookUrl.trim()) {
      toast.error('Webhook URL is required for external booking systems')
      return
    }

    try {
      const response = await fetch('/api/calendar-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          calendarName,
          webhookUrl: webhookUrl || null,
          apiKey: apiKey || null,
          calendarId: calendarId || null,
        }),
      })

      if (response.ok) {
        toast.success('Calendar connection added successfully')
        setIsAddDialogOpen(false)
        resetForm()
        fetchConnections()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to add calendar connection')
      }
    } catch (error) {
      console.error('Error adding connection:', error)
      toast.error('Failed to add calendar connection')
    }
  }

  const handleToggleSync = async (connectionId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/calendar-connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncEnabled: enabled }),
      })

      if (response.ok) {
        toast.success(`Sync ${enabled ? 'enabled' : 'disabled'}`)
        fetchConnections()
      } else {
        toast.error('Failed to update sync settings')
      }
    } catch (error) {
      console.error('Error toggling sync:', error)
      toast.error('Failed to update sync settings')
    }
  }

  const handleSync = async (connectionId: string) => {
    try {
      setIsSyncing(connectionId)
      const response = await fetch(`/api/calendar-connections/${connectionId}/sync`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success(`Synced ${data.syncedCount || 0} events`)
        } else {
          toast.error(data.error || 'Sync failed')
        }
        fetchConnections()
      } else {
        toast.error('Failed to sync calendar')
      }
    } catch (error) {
      console.error('Error syncing:', error)
      toast.error('Failed to sync calendar')
    } finally {
      setIsSyncing(null)
    }
  }

  const handleSyncAll = async () => {
    try {
      setIsSyncing('all')
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success(`Synced ${data.syncedCount || 0} events from ${data.connectionsCount || 0} calendars`)
        } else {
          toast.error(data.error || 'Sync failed')
        }
        fetchConnections()
      } else {
        toast.error('Failed to sync calendars')
      }
    } catch (error) {
      console.error('Error syncing all:', error)
      toast.error('Failed to sync calendars')
    } finally {
      setIsSyncing(null)
    }
  }

  const handleDelete = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this calendar connection?')) {
      return
    }

    try {
      const response = await fetch(`/api/calendar-connections/${connectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Calendar connection deleted')
        fetchConnections()
      } else {
        toast.error('Failed to delete calendar connection')
      }
    } catch (error) {
      console.error('Error deleting connection:', error)
      toast.error('Failed to delete calendar connection')
    }
  }

  const resetForm = () => {
    setProvider('GOOGLE')
    setCalendarName('')
    setWebhookUrl('')
    setApiKey('')
    setCalendarId('')
  }

  const getSyncStatusColor = (status: SyncStatus): string => {
    switch (status) {
      case 'SYNCED':
        return 'bg-green-500'
      case 'PENDING':
        return 'bg-yellow-500'
      case 'FAILED':
        return 'bg-red-500'
      case 'DISABLED':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Check if Google Calendar is already connected
  useEffect(() => {
    const checkGoogleConnection = async () => {
      try {
        const response = await fetch('/api/calendar/status');
        if (response.ok) {
          const data = await response.json();
          setIsGoogleConnected(data.isConnected);
        }
      } catch (error) {
        console.error('Error checking Google Calendar status:', error);
      }
    };
    checkGoogleConnection();
  }, []);

  const handleGoogleConnectionSuccess = () => {
    setIsGoogleConnected(true);
    fetchConnections();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Calendar Integrations</h3>
          <p className="text-sm text-muted-foreground">
            Connect multiple calendars for two-way sync and appointment management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={isSyncing === 'all' || connections.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing === 'all' ? 'animate-spin' : ''}`} />
            Sync All
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Calendar Connection</DialogTitle>
                <DialogDescription>
                  Connect a new calendar provider or external booking system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Calendar Provider</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as CalendarProvider)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(providerLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Connection Name</Label>
                  <Input
                    placeholder="e.g., My Work Calendar"
                    value={calendarName}
                    onChange={(e) => setCalendarName(e.target.value)}
                  />
                </div>

                {provider === 'EXTERNAL_API' && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        For external booking systems, provide your webhook URL. Appointments will be synced via API calls.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        placeholder="https://your-booking-system.com/api/webhook"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your booking system should support REST API endpoints for appointments
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>API Key (Optional)</Label>
                      <Input
                        type="password"
                        placeholder="Your API key for authentication"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {(provider === 'GOOGLE' || provider === 'OUTLOOK' || provider === 'OFFICE365') && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {provider === 'GOOGLE' && 'You need to configure OAuth2 credentials for Google Calendar. Please set up Google Cloud Console credentials.'}
                        {(provider === 'OUTLOOK' || provider === 'OFFICE365') && 'You need to configure Microsoft Graph API credentials. Please set up Azure AD application.'}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Calendar ID (Optional)</Label>
                      <Input
                        placeholder="primary"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use the primary calendar
                      </p>
                    </div>
                  </>
                )}

                {provider === 'APPLE' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Apple Calendar integration requires CalDAV configuration. For now, you can use the External API option with your iCloud webhook.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddConnection}>Add Connection</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Easy Google Calendar Connection */}
      <GoogleCalendarConnect 
        isConnected={isGoogleConnected} 
        onConnectionSuccess={handleGoogleConnectionSuccess} 
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No calendar connections</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect your calendars to enable two-way sync for appointments
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Calendar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => {
            const Icon = providerIcons[connection.provider]
            return (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {connection.calendarName || providerLabels[connection.provider]}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {providerLabels[connection.provider]}
                          {connection.calendarId && (
                            <Badge variant="secondary" className="text-xs">
                              {connection.calendarId}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`${getSyncStatusColor(connection.syncStatus)} text-white`}
                      >
                        {connection.syncStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`sync-${connection.id}`} className="text-sm font-normal">
                          Two-way sync enabled
                        </Label>
                        <Switch
                          id={`sync-${connection.id}`}
                          checked={connection.syncEnabled}
                          onCheckedChange={(checked) => handleToggleSync(connection.id, checked)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(connection.id)}
                          disabled={isSyncing === connection.id || !connection.syncEnabled}
                        >
                          <RefreshCw
                            className={`h-3 w-3 mr-2 ${isSyncing === connection.id ? 'animate-spin' : ''}`}
                          />
                          Sync Now
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(connection.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {connection.lastSyncAt && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
                      </p>
                    )}

                    {connection.webhookUrl && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium mb-1">Webhook URL:</p>
                        <p className="text-xs text-muted-foreground font-mono break-all">
                          {connection.webhookUrl}
                        </p>
                      </div>
                    )}

                    {connection.provider === 'EXTERNAL_API' && (
                      <Alert>
                        <ExternalLink className="h-4 w-4" />
                        <AlertDescription>
                          <p className="text-xs mb-2">Your webhook endpoint for receiving events:</p>
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            POST /api/external-calendar-webhook
                          </code>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">Google Calendar / Outlook / Office 365</p>
            <p className="text-muted-foreground">
              Requires OAuth2 setup with proper credentials in your environment variables.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">External Booking Systems</p>
            <p className="text-muted-foreground">
              Connect any booking system that supports REST API webhooks. Appointments will be synced automatically via API calls.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Two-Way Sync</p>
            <p className="text-muted-foreground">
              When enabled, appointments created in your CRM are automatically added to your calendar, and vice versa.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
