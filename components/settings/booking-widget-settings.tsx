
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, ExternalLink, Code, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

export function BookingWidgetSettings() {
  const { data: session } = useSession() || {}
  const [copied, setCopied] = useState(false)
  const [widgetUrl, setWidgetUrl] = useState('')
  const [embedCode, setEmbedCode] = useState('')

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
  }, [session])

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenPreview = () => {
    window.open(widgetUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Booking Widget</h2>
        <p className="text-muted-foreground">
          Embed the appointment booking widget on your website or share the direct link with customers.
        </p>
      </div>

      <Tabs defaultValue="link" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="link">Direct Link</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="space-y-6 mt-6">
          <Card className="p-6 bg-card">
            <div className="space-y-4">
              <div>
                <Label htmlFor="widgetUrl">Booking Page URL</Label>
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
                  Share this URL with your customers to allow them to book appointments directly.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How to use:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy the URL above</li>
                  <li>Share it via email, social media, or your website</li>
                  <li>Customers can select a date and time</li>
                  <li>You'll receive notifications for new bookings</li>
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
                  Paste this code into your website's HTML to embed the booking widget.
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
            title="Booking Widget Preview"
          />
        </div>
      </Card>

      {/* Business Hours Configuration */}
      <Card className="p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Currently using default hours (9 AM - 5 PM, Monday to Friday). Custom business hours coming soon.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between p-2 bg-muted/50 rounded">
            <span>Monday - Friday</span>
            <span className="font-medium">9:00 AM - 5:00 PM</span>
          </div>
          <div className="flex justify-between p-2 bg-muted/50 rounded">
            <span>Saturday - Sunday</span>
            <span className="text-muted-foreground">Closed</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
