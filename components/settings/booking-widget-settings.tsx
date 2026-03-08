
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Copy, ExternalLink, Code, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { getIndustryBookingConfig } from '@/lib/industry-booking-config'

export function BookingWidgetSettings() {
  const { data: session, status } = useSession() || {}
  const [copied, setCopied] = useState(false)
  const [widgetUrl, setWidgetUrl] = useState('')
  const [embedCode, setEmbedCode] = useState('')
  const [businessHours, setBusinessHours] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  })
  const [hoursLoading, setHoursLoading] = useState(false)
  const [hoursSaving, setHoursSaving] = useState(false)

  const [resolvedIndustry, setResolvedIndustry] = useState<string | null>(
    ((session?.user as any)?.industry as string) || null,
  )
  const industry =
    resolvedIndustry || ((session?.user as any)?.industry as string) || null
  const config = getIndustryBookingConfig(industry)

  useEffect(() => {
    const fromSession = ((session?.user as any)?.industry as string) || null
    if (fromSession) {
      setResolvedIndustry(fromSession)
      return
    }

    if (status === 'authenticated') {
      fetch('/api/session/context')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = (data?.industry as string | null) || null
          if (resolved) setResolvedIndustry(resolved)
        })
        .catch(() => {})
    }
  }, [status, (session?.user as any)?.industry])

  useEffect(() => {
    if (session?.user?.id) {
      const baseUrl = window.location.origin
      const url = `${baseUrl}/booking/${session.user.id}`
      setWidgetUrl(url)

      const code = `<iframe
  src="${url}"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
></iframe>`
      setEmbedCode(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    const loadBookingSettings = async () => {
      if (!session?.user?.id) return
      try {
        setHoursLoading(true)
        const response = await fetch('/api/booking/settings')
        if (!response.ok) return
        const data = await response.json()
        const schedule = data?.settings?.availabilitySchedule
        if (schedule && typeof schedule === 'object') {
          setBusinessHours((prev) => ({ ...prev, ...schedule }))
        }
      } catch (error) {
        console.error('Failed to load booking settings:', error)
      } finally {
        setHoursLoading(false)
      }
    }
    loadBookingSettings()
  }, [session?.user?.id])

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenPreview = () => {
    window.open(widgetUrl, '_blank')
  }

  const handleSaveBusinessHours = async () => {
    try {
      setHoursSaving(true)
      const response = await fetch('/api/booking/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilitySchedule: businessHours,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || 'Failed to save business hours')
      }
      toast.success('Business hours saved')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save business hours')
    } finally {
      setHoursSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold">{config.bookingNoun} Widget</h2>
          {industry && (
            <Badge variant="secondary" className="text-xs">
              {industry.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Embed the {config.bookingNoun.toLowerCase()} booking widget on your website or share the direct link with customers.
        </p>
      </div>

      {/* Industry-specific fields preview */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <h4 className="font-medium text-sm mb-2">Fields shown to customers:</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Name</Badge>
          <Badge variant="outline">Email</Badge>
          <Badge variant="outline">Phone</Badge>
          <Badge variant="outline">Date & Time</Badge>
          {config.extraFields.map((field) => (
            <Badge
              key={field.id}
              variant={field.required ? 'default' : 'outline'}
            >
              {field.label}{field.required ? ' *' : ''}
            </Badge>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="link" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="link">Direct Link</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="space-y-6 mt-6">
          <Card className="p-6 bg-card">
            <div className="space-y-4">
              <div>
                <Label htmlFor="widgetUrl">{config.bookingNoun} Page URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="widgetUrl"
                    value={widgetUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(widgetUrl, 'URL')}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleOpenPreview}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Share this URL with your customers to allow them to book {config.bookingPluralNoun.toLowerCase()} directly.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How to use:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy the URL above</li>
                  <li>Share it via email, social media, or your website</li>
                  <li>Customers can select a date and time</li>
                  <li>You&apos;ll receive notifications for new {config.bookingPluralNoun.toLowerCase()}</li>
                </ol>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6 mt-6">
          <Card className="p-6 bg-card">
            <div className="space-y-4">
              <div>
                <Label htmlFor="embedCode">Embed Code</Label>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                      <code>{embedCode}</code>
                    </pre>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => handleCopy(embedCode, 'Embed code')}
                >
                  <Code className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Embed Code'}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Paste this code into your website&apos;s HTML to embed the {config.bookingNoun.toLowerCase()} widget.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How to embed:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy the embed code above</li>
                  <li>Open your website editor or HTML file</li>
                  <li>Paste the code where you want the widget to appear</li>
                  <li>Save and publish your changes</li>
                </ol>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Compatible with:</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['WordPress', 'Wix', 'Squarespace', 'Webflow', 'Custom HTML'].map(platform => (
                    <div key={platform} className="px-3 py-1 bg-background rounded-md border text-sm">
                      {platform}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card className="p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={widgetUrl}
            width="100%"
            height="600"
            style={{ border: 'none' }}
            title={`${config.bookingNoun} Widget Preview`}
          />
        </div>
      </Card>

      {/* Business Hours Configuration */}
      <Card className="p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure your booking availability windows. These hours are used by your public booking page.
        </p>
        <div className="space-y-3">
          {Object.entries(businessHours).map(([day, value]) => (
            <div key={day} className="grid grid-cols-12 gap-3 items-center p-3 bg-muted/50 rounded">
              <div className="col-span-3 font-medium capitalize">{day}</div>
              <div className="col-span-2">
                <Switch
                  checked={value.enabled}
                  onCheckedChange={(enabled) =>
                    setBusinessHours((prev) => ({ ...prev, [day]: { ...prev[day], enabled } }))
                  }
                  disabled={hoursLoading || hoursSaving}
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="time"
                  value={value.start}
                  disabled={!value.enabled || hoursLoading || hoursSaving}
                  onChange={(e) =>
                    setBusinessHours((prev) => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))
                  }
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="time"
                  value={value.end}
                  disabled={!value.enabled || hoursLoading || hoursSaving}
                  onChange={(e) =>
                    setBusinessHours((prev) => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))
                  }
                />
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Button onClick={handleSaveBusinessHours} disabled={hoursLoading || hoursSaving}>
              {hoursSaving ? 'Saving...' : 'Save Business Hours'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
