
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Copy, 
  Check,
  Clock,
  MessageSquare,
  Loader2,
  AlertCircle,
  Send
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  content: string
  messageType: string
  isUsed: boolean
  createdAt: Date
  updatedAt: Date
}

interface Lead {
  id: string
  businessName: string
  contactPerson?: string | null
  email?: string | null
  businessCategory?: string | null
  rating?: number | null
}

interface MessagesSectionProps {
  leadId: string
  messages: Message[]
  lead: Lead
}

export function MessagesSection({ leadId, messages: initialMessages, lead }: MessagesSectionProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleGenerateMessage = async () => {
    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/messages/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId }),
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
                setMessages(prev => [parsed.message, ...prev])
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

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Copy error:', error)
    }
  }

  const handleMarkAsUsed = async (messageId: string, isUsed: boolean) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isUsed }),
      })

      if (response.ok) {
        const updatedMessage = await response.json()
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? updatedMessage : msg
        ))
      }
    } catch (error) {
      console.error('Mark as used error:', error)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Generate Message Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleGenerateMessage} 
          disabled={isGenerating}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Message
            </>
          )}
        </Button>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className={`${message.isUsed ? 'bg-green-50 border-green-200' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <CardTitle className="text-sm">AI Generated Message</CardTitle>
                      <Badge variant={message.isUsed ? 'default' : 'secondary'}>
                        {message.isUsed ? 'Used' : 'Draft'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {message.messageType.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(message.createdAt))} ago
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-card border rounded-lg">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyMessage(message.content, message.id)}
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-4 w-4 mr-1 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                        
                        {lead.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a
                              href={`mailto:${lead.email}?subject=Business Opportunity&body=${encodeURIComponent(message.content)}`}
                              onClick={() => handleMarkAsUsed(message.id, true)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send Email
                            </a>
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant={message.isUsed ? "secondary" : "default"}
                        onClick={() => handleMarkAsUsed(message.id, !message.isUsed)}
                      >
                        {message.isUsed ? 'Mark as Draft' : 'Mark as Used'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No AI messages generated yet.</p>
            <p className="text-sm">Click the button above to generate your first personalized outreach message.</p>
          </div>
        )}
      </div>
    </div>
  )
}
