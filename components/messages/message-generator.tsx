
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Sparkles, 
  ArrowLeft, 
  Loader2, 
  Copy, 
  Check,
  AlertCircle,
  Building,
  User,
  MapPin,
  Star
} from 'lucide-react'

interface Lead {
  id: string
  businessName: string
  contactPerson?: string | null
  email?: string | null
  businessCategory?: string | null
  city?: string | null
  state?: string | null
  rating?: number | null
}

interface MessageGeneratorProps {
  lead: Lead
}

export function MessageGenerator({ lead }: MessageGeneratorProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')
    setGeneratedMessage('')

    try {
      const response = await fetch('/api/messages/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId: lead.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.status === 'completed') {
                setGeneratedMessage(parsed.message.content)
                return
              } else if (parsed.status === 'error') {
                throw new Error(parsed.message || 'Generation failed')
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Generate message error:', error)
      setError('Failed to generate message. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy error:', error)
    }
  }

  const handleBackToLead = () => {
    router.push(`/dashboard/leads/${lead.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBackToLead}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lead
        </Button>
      </div>

      <div className="space-y-6">
        {/* Lead Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Lead Information
            </CardTitle>
            <CardDescription>
              Generating personalized message for this lead
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center font-medium">
                  <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                  {lead.businessName}
                </div>
                {lead.contactPerson && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    {lead.contactPerson}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {(lead.city || lead.state) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {[lead.city, lead.state].filter(Boolean).join(', ')}
                  </div>
                )}
                {lead.rating && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-4 w-4 mr-2 text-yellow-500 fill-current" />
                    {lead.rating}/5 stars
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              AI Message Generator
            </CardTitle>
            <CardDescription>
              Create a personalized outreach message using AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Message...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate AI Message
                  </>
                )}
              </Button>
            </div>

            {generatedMessage && (
              <div className="space-y-4">
                <div className="p-6 bg-card border rounded-lg">
                  <h4 className="font-medium mb-3">Generated Message:</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {generatedMessage}
                  </p>
                </div>
                
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    disabled={!generatedMessage}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Message
                      </>
                    )}
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleGenerate}>
                      Generate Another
                    </Button>
                    <Button onClick={handleBackToLead}>
                      Back to Lead
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
