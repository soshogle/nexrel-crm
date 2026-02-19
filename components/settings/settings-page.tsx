
'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlaceAutocomplete } from '@/components/ui/place-autocomplete'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarConnections } from '@/components/settings/calendar-connections'
import { MessagingConnections } from '@/components/settings/messaging-connections'
import { GoogleWorkspaceSettings } from '@/components/settings/google-workspace-settings'
import { SocialMediaSettings } from '@/components/settings/social-media-settings'
import { KnowledgeBaseSettings } from '@/components/settings/knowledge-base-settings'
import PermissionsManager from '@/components/settings/permissions-manager'
import { AutoReplySettings } from '@/components/settings/auto-reply-settings'
import { BookingWidgetSettings } from '@/components/settings/booking-widget-settings'
import { SubdomainSettings } from '@/components/settings/subdomain-settings'
import { QuickBooksSettings } from '@/components/settings/quickbooks-settings'
import { WhatsAppSettings } from '@/components/settings/whatsapp-settings'
import MetaSettings from '@/components/settings/meta-settings'
import LanguageSelector from '@/components/settings/language-selector'
import BillingUpgradeCard from '@/components/dashboard/billing-upgrade-card'
import { EHRBridgeSettings } from '@/components/settings/ehr-bridge-settings'
import { 
  User, 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  ExternalLink,
  MapPin,
  Calendar,
  MessageSquare,
  Mail,
  Book,
  Bot,
  Link2,
  DollarSign,
  MessageCircle,
  CreditCard,
  Globe,
  Languages,
  Shield,
  Instagram,
  Share2,
  Plug
} from 'lucide-react'

interface SettingsPageProps {
  session: {
    user?: {
      name?: string | null
      email?: string | null
    }
  }
}

export function SettingsPage({ session }: SettingsPageProps) {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const [googlePlacesKey, setGooglePlacesKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  // Profile state
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    checkApiKey()
    loadProfile()
  }, [])

  const checkApiKey = async () => {
    try {
      const response = await fetch('/api/api-keys/google-places')
      if (response.ok) {
        const data = await response.json()
        setHasApiKey(data.hasKey)
      }
    } catch (error) {
      console.error('Error checking API key:', error)
    }
  }

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true)
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setCompanyName(data.name || '')
        setPhone(data.phone || '')
        setAddress(data.address || '')
        setWebsite(data.website || '')
        setBusinessDescription(data.businessDescription || '')
        setTimezone(data.timezone || 'America/New_York')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!companyName.trim()) {
      setProfileError('Company name cannot be empty')
      return
    }

    setIsSavingProfile(true)
    setProfileError('')
    setProfileMessage('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          website: website.trim(),
          businessDescription: businessDescription.trim(),
          timezone: timezone,
        }),
      })

      if (response.ok) {
        setProfileMessage('Business profile updated successfully!')
        setTimeout(() => setProfileMessage(''), 3000)
      } else {
        const data = await response.json()
        setProfileError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Save profile error:', error)
      setProfileError('An error occurred while updating your profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveApiKey = async () => {
    if (!googlePlacesKey.trim()) {
      setError('Please enter a valid API key')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/api-keys/google-places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: googlePlacesKey.trim(),
        }),
      })

      if (response.ok) {
        setMessage('Google Places API key saved successfully!')
        setHasApiKey(true)
        setGooglePlacesKey('')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save API key')
      }
    } catch (error) {
      console.error('Save API key error:', error)
      setError('An error occurred while saving the API key')
    } finally {
      setIsSaving(false)
    }
  }

  const [activeSection, setActiveSection] = useState('profile')

  const settingsSections = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'billing', label: t('billing'), icon: CreditCard },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'google-workspace', label: 'Google Workspace', icon: Mail },
    { id: 'social-media', label: 'Social Media', icon: Share2 },
    { id: 'calendars', label: t('calendar'), icon: Calendar },
    { id: 'booking-widget', label: 'Booking Widget', icon: Link2 },
    { id: 'subdomain', label: 'Subdomain', icon: Globe },
    { id: 'messaging', label: t('messaging'), icon: MessageSquare },
    { id: 'meta', label: 'Meta (Instagram/Facebook)', icon: Instagram },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'quickbooks', label: 'QuickBooks', icon: DollarSign },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: Book },
    { id: 'ehr-bridge', label: 'EHR Bridge', icon: Plug },
    { id: 'auto-reply', label: 'AI Auto-Reply', icon: Bot },
    { id: 'language', label: t('language'), icon: Languages },
    { id: 'permissions', label: t('permissions'), icon: Shield },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">{t('title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1 p-2">
                {settingsSections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-purple-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'billing' && (
            <BillingUpgradeCard />
          )}

          {activeSection === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Business Profile
              </CardTitle>
              <CardDescription>
                Manage your business information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileMessage && (
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {profileMessage}
                  </AlertDescription>
                </Alert>
              )}

              {profileError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    disabled={isLoadingProfile}
                  />
                  <p className="text-sm text-muted-foreground">
                    This will be displayed in your booking widget and communications
                  </p>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={session?.user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email address cannot be changed
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    disabled={isLoadingProfile}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your business contact phone number
                  </p>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.yourcompany.com"
                    disabled={isLoadingProfile}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your company website URL
                  </p>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <PlaceAutocomplete
                    value={address}
                    onChange={(val) => setAddress(val)}
                    placeholder="Start typing to search for your address..."
                    types="address"
                    disabled={isLoadingProfile}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your complete business address (start typing for suggestions)
                  </p>
                </div>

                {/* Business Description */}
                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description</Label>
                  <Textarea
                    id="businessDescription"
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="Describe what your business does, your services, and what makes you unique..."
                    disabled={isLoadingProfile}
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    A brief description of your business (used by AI assistant for context)
                  </p>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={timezone}
                    onValueChange={setTimezone}
                    disabled={isLoadingProfile}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select your timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Your business timezone for scheduling and appointments
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={isSavingProfile || isLoadingProfile || !companyName.trim()}
                className="w-full sm:w-auto"
              >
                {isSavingProfile ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Business Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          )}

          {activeSection === 'api-keys' && (
          <div className="space-y-6">
            {/* Google Places API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Google Places API
                </CardTitle>
                <CardDescription>
                  Configure your Google Places API key to search for business leads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasApiKey && (
                  <Alert className="bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Google Places API key is configured and active
                    </AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert className="bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      {message}
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="googlePlacesKey">
                      Google Places API Key {hasApiKey ? '(Update)' : ''}
                    </Label>
                    <div className="relative">
                      <Input
                        id="googlePlacesKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={googlePlacesKey}
                        onChange={(e) => setGooglePlacesKey(e.target.value)}
                        placeholder="Enter your Google Places API key"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveApiKey} 
                    disabled={isSaving || !googlePlacesKey.trim()}
                  >
                    {isSaving ? (
                      'Saving...'
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {hasApiKey ? 'Update API Key' : 'Save API Key'}
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to get your API key:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Go to the Google Cloud Console</li>
                    <li>2. Enable the Places API</li>
                    <li>3. Create credentials (API key)</li>
                    <li>4. Restrict the key to Places API</li>
                    <li>5. Copy and paste the key above</li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    asChild
                  >
                    <a
                      href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Google Cloud Console
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Usage Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  API Security
                </CardTitle>
                <CardDescription>
                  Information about how your API keys are stored
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Your API keys are stored securely:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Keys are encrypted in our database</li>
                      <li>• Only you can access your keys</li>
                      <li>• Keys are never shared or exposed to other users</li>
                      <li>• You can update or remove your keys at any time</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === 'google-workspace' && (
            <GoogleWorkspaceSettings />
          )}

          {activeSection === 'social-media' && (
            <SocialMediaSettings />
          )}

          {activeSection === 'calendars' && (
            <CalendarConnections />
          )}

          {activeSection === 'booking-widget' && (
            <BookingWidgetSettings />
          )}

          {activeSection === 'subdomain' && (
            <SubdomainSettings />
          )}

          {activeSection === 'messaging' && (
            <MessagingConnections />
          )}

          {activeSection === 'meta' && (
            <MetaSettings />
          )}

          {activeSection === 'whatsapp' && (
            <WhatsAppSettings />
          )}

          {activeSection === 'quickbooks' && (
            <QuickBooksSettings />
          )}

          {activeSection === 'knowledge-base' && (
            <KnowledgeBaseSettings />
          )}

          {activeSection === 'auto-reply' && (
            <AutoReplySettings />
          )}

          {activeSection === 'language' && (
            <LanguageSelector />
          )}

          {activeSection === 'permissions' && (
            <PermissionsManager />
          )}

          {activeSection === 'ehr-bridge' && (
            <EHRBridgeSettings />
          )}
        </div>
      </div>
    </div>
  )
}
