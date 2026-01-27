
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Facebook, 
  Instagram, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Trash2,
  RefreshCw
} from "lucide-react"

type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING_AUTH'
type ChannelType = 'SMS' | 'EMAIL' | 'FACEBOOK_MESSENGER' | 'INSTAGRAM'

interface Connection {
  id: string
  channelType: ChannelType
  displayName?: string
  channelIdentifier: string
  status: ConnectionStatus
  providerType: string
  errorMessage?: string
  createdAt: string
}

const channelIcons = {
  SMS: Phone,
  EMAIL: Mail,
  FACEBOOK_MESSENGER: Facebook,
  INSTAGRAM: Instagram
}

const channelNames = {
  SMS: "SMS",
  EMAIL: "Email",
  FACEBOOK_MESSENGER: "Facebook Messenger",
  INSTAGRAM: "Instagram Direct"
}

export function MessagingConnections() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [showTwilioDialog, setShowTwilioDialog] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/messaging/connections')
      if (response.ok) {
        const data = await response.json()
        setConnections(data)
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectFacebook = async () => {
    try {
      // Initiate Facebook OAuth flow
      const response = await fetch('/api/messaging/connections/facebook/auth')
      const { authUrl } = await response.json()
      
      // Open OAuth popup
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      
      const popup = window.open(
        authUrl,
        'Facebook OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'facebook-oauth-success') {
          toast.success('Facebook Messenger connected successfully!')
          fetchConnections()
          popup?.close()
          window.removeEventListener('message', handleMessage)
        } else if (event.data?.type === 'facebook-oauth-error') {
          toast.error('Failed to connect Facebook Messenger')
          popup?.close()
          window.removeEventListener('message', handleMessage)
        }
      }

      window.addEventListener('message', handleMessage)
    } catch (error) {
      console.error('Facebook connection error:', error)
      toast.error('Failed to initiate Facebook connection')
    }
  }

  const handleConnectInstagram = async () => {
    try {
      // Initiate Instagram OAuth flow
      const response = await fetch('/api/messaging/connections/instagram/auth')
      const { authUrl } = await response.json()
      
      // Open OAuth popup
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      
      const popup = window.open(
        authUrl,
        'Instagram OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'instagram-oauth-success') {
          toast.success('Instagram connected successfully!')
          fetchConnections()
          popup?.close()
          window.removeEventListener('message', handleMessage)
        } else if (event.data?.type === 'instagram-oauth-error') {
          toast.error('Failed to connect Instagram')
          popup?.close()
          window.removeEventListener('message', handleMessage)
        }
      }

      window.addEventListener('message', handleMessage)
    } catch (error) {
      console.error('Instagram connection error:', error)
      toast.error('Failed to initiate Instagram connection')
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return

    try {
      const response = await fetch(`/api/messaging/connections/${connectionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Channel disconnected')
        fetchConnections()
      } else {
        toast.error('Failed to disconnect channel')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect channel')
    }
  }

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'PENDING_AUTH':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>
      case 'ERROR':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>
      case 'PENDING_AUTH':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
      default:
        return <Badge variant="outline">Disconnected</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Messaging Connections</h3>
        <p className="text-sm text-muted-foreground">
          Connect your communication channels to manage all messages in one place.
        </p>
      </div>

      {/* Connection Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* SMS Service */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle>SMS</CardTitle>
              </div>
              {connections.find(c => c.channelType === 'SMS') && 
                getStatusIcon(connections.find(c => c.channelType === 'SMS')!.status)
              }
            </div>
            <CardDescription>Send and receive SMS messages</CardDescription>
          </CardHeader>
          <CardContent>
            {connections.find(c => c.channelType === 'SMS') ? (
              <div className="space-y-3">
                {getStatusBadge(connections.find(c => c.channelType === 'SMS')!.status)}
                <p className="text-sm">
                  Phone: {connections.find(c => c.channelType === 'SMS')!.channelIdentifier}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDisconnect(connections.find(c => c.channelType === 'SMS')!.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowTwilioDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowTwilioDialog(true)}>
                Connect SMS
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Email */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Email</CardTitle>
              </div>
              {connections.find(c => c.channelType === 'EMAIL') && 
                getStatusIcon(connections.find(c => c.channelType === 'EMAIL')!.status)
              }
            </div>
            <CardDescription>Connect your email inbox</CardDescription>
          </CardHeader>
          <CardContent>
            {connections.find(c => c.channelType === 'EMAIL') ? (
              <div className="space-y-3">
                {getStatusBadge(connections.find(c => c.channelType === 'EMAIL')!.status)}
                <p className="text-sm">
                  Email: {connections.find(c => c.channelType === 'EMAIL')!.channelIdentifier}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDisconnect(connections.find(c => c.channelType === 'EMAIL')!.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowEmailDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowEmailDialog(true)}>
                Connect Email
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Facebook Messenger */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-primary" />
                <CardTitle>Facebook Messenger</CardTitle>
              </div>
              {connections.find(c => c.channelType === 'FACEBOOK_MESSENGER') && 
                getStatusIcon(connections.find(c => c.channelType === 'FACEBOOK_MESSENGER')!.status)
              }
            </div>
            <CardDescription>Connect your Facebook Business Page</CardDescription>
          </CardHeader>
          <CardContent>
            {connections.find(c => c.channelType === 'FACEBOOK_MESSENGER') ? (
              <div className="space-y-3">
                {getStatusBadge(connections.find(c => c.channelType === 'FACEBOOK_MESSENGER')!.status)}
                <p className="text-sm">
                  Page: {connections.find(c => c.channelType === 'FACEBOOK_MESSENGER')!.displayName}
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDisconnect(connections.find(c => c.channelType === 'FACEBOOK_MESSENGER')!.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnectFacebook}>
                Connect Facebook
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Instagram */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-primary" />
                <CardTitle>Instagram Direct</CardTitle>
              </div>
              {connections.find(c => c.channelType === 'INSTAGRAM') && 
                getStatusIcon(connections.find(c => c.channelType === 'INSTAGRAM')!.status)
              }
            </div>
            <CardDescription>Connect your Instagram Business Account</CardDescription>
          </CardHeader>
          <CardContent>
            {connections.find(c => c.channelType === 'INSTAGRAM') ? (
              <div className="space-y-3">
                {getStatusBadge(connections.find(c => c.channelType === 'INSTAGRAM')!.status)}
                <p className="text-sm">
                  Account: {connections.find(c => c.channelType === 'INSTAGRAM')!.displayName}
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDisconnect(connections.find(c => c.channelType === 'INSTAGRAM')!.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnectInstagram}>
                Connect Instagram
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Twilio Connection Dialog */}
      <TwilioConnectionDialog 
        open={showTwilioDialog}
        onOpenChange={setShowTwilioDialog}
        onSuccess={() => {
          fetchConnections()
          setShowTwilioDialog(false)
        }}
      />

      {/* Email Connection Dialog */}
      <EmailConnectionDialog 
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSuccess={() => {
          fetchConnections()
          setShowEmailDialog(false)
        }}
      />
    </div>
  )
}

// Twilio Connection Dialog
function TwilioConnectionDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/messaging/connections/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('SMS service connected successfully!')
        onSuccess()
        setFormData({ accountSid: '', authToken: '', phoneNumber: '' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to connect SMS service')
      }
    } catch (error) {
      console.error('SMS connection error:', error)
      toast.error('Failed to connect SMS service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Connect SMS Service</DialogTitle>
          <DialogDescription>
            Enter your SMS service credentials to enable messaging.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID</Label>
            <Input
              id="accountSid"
              value={formData.accountSid}
              onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token</Label>
            <Input
              id="authToken"
              type="password"
              value={formData.authToken}
              onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              placeholder="Your Auth Token"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">SMS Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+1234567890"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Email Connection Dialog
function EmailConnectionDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [emailType, setEmailType] = useState<'gmail' | 'custom'>('gmail')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    smtpHost: '',
    smtpPort: '587',
    imapHost: '',
    imapPort: '993'
  })
  const [loading, setLoading] = useState(false)

  const handleGmailOAuth = async () => {
    try {
      const response = await fetch('/api/messaging/connections/gmail/auth')
      const { authUrl } = await response.json()
      
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      
      const popup = window.open(
        authUrl,
        'Gmail OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'gmail-oauth-success') {
          toast.success('Gmail connected successfully!')
          onSuccess()
          popup?.close()
          window.removeEventListener('message', handleMessage)
        } else if (event.data?.type === 'gmail-oauth-error') {
          toast.error('Failed to connect Gmail')
          popup?.close()
          window.removeEventListener('message', handleMessage)
        }
      }

      window.addEventListener('message', handleMessage)
    } catch (error) {
      console.error('Gmail OAuth error:', error)
      toast.error('Failed to initiate Gmail connection')
    }
  }

  const handleCustomEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/messaging/connections/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Email connected successfully!')
        onSuccess()
        setFormData({ email: '', password: '', smtpHost: '', smtpPort: '587', imapHost: '', imapPort: '993' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to connect email')
      }
    } catch (error) {
      console.error('Email connection error:', error)
      toast.error('Failed to connect email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect Email</DialogTitle>
          <DialogDescription>
            Choose your email provider to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={emailType} onValueChange={(v) => setEmailType(v as 'gmail' | 'custom')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gmail">Gmail (OAuth)</SelectItem>
              <SelectItem value="custom">Custom SMTP/IMAP</SelectItem>
            </SelectContent>
          </Select>

          {emailType === 'gmail' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Gmail account using secure OAuth authentication.
              </p>
              <Button onClick={handleGmailOAuth} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Connect with Gmail
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCustomEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">App Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Your email app password"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                    placeholder="smtp.example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                    placeholder="587"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imapHost">IMAP Host</Label>
                  <Input
                    id="imapHost"
                    value={formData.imapHost}
                    onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                    placeholder="imap.example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">IMAP Port</Label>
                  <Input
                    id="imapPort"
                    value={formData.imapPort}
                    onChange={(e) => setFormData({ ...formData, imapPort: e.target.value })}
                    placeholder="993"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
