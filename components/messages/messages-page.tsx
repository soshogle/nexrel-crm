
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  MessageSquare, 
  Search, 
  Copy, 
  Check,
  Eye,
  Send,
  Calendar,
  Building,
  User,
  Mail,
  Sparkles
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  content: string
  messageType: string
  isUsed: boolean
  createdAt: Date
  lead: {
    id: string
    businessName: string
    contactPerson?: string | null
    email?: string | null
  }
}

interface MessagesPageProps {
  messages: Message[]
}

export function MessagesPage({ messages: initialMessages }: MessagesPageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredMessages = messages.filter((message) => {
    const matchesSearch = 
      message.lead.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.lead.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'USED' && message.isUsed) || 
      (statusFilter === 'DRAFT' && !message.isUsed)

    return matchesSearch && matchesStatus
  })

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
          msg.id === messageId ? { ...msg, isUsed: updatedMessage.isUsed } : msg
        ))
      }
    } catch (error) {
      console.error('Mark as used error:', error)
    }
  }

  const stats = {
    total: messages.length,
    used: messages.filter(m => m.isUsed).length,
    draft: messages.filter(m => !m.isUsed).length,
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Used Messages</p>
                <p className="text-3xl font-bold text-green-600">{stats.used}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Draft Messages</p>
                <p className="text-3xl font-bold text-orange-600">{stats.draft}</p>
              </div>
              <Copy className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages or businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Messages</SelectItem>
                <SelectItem value="USED">Used</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredMessages.length} of {messages.length} messages
        </p>
      </div>

      {/* Empty State */}
      {filteredMessages.length === 0 && (
        <Card className="bg-card border">
          <CardContent className="p-12">
            <div className="text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">
                {searchTerm || statusFilter !== 'ALL' ? 'No messages found' : 'No messages yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'Try adjusting your search or filters'
                  : 'Start generating AI messages for your leads'
                }
              </p>
              {!searchTerm && statusFilter === 'ALL' && (
                <Button asChild>
                  <Link href="/dashboard/leads">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Go to Leads
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages List */}
      {filteredMessages.length > 0 && (
        <div className="space-y-4">
          {filteredMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`hover:shadow-md transition-shadow bg-card border ${message.isUsed ? 'border-green-500/30' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg flex items-center text-foreground">
                          <Building className="h-4 w-4 mr-2" />
                          {message.lead.businessName}
                        </CardTitle>
                        <Badge variant={message.isUsed ? 'default' : 'secondary'}>
                          {message.isUsed ? 'Used' : 'Draft'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {message.messageType.replace('_', ' ')}
                        </Badge>
                      </div>
                      {message.lead.contactPerson && (
                        <CardDescription className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {message.lead.contactPerson}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDistanceToNow(new Date(message.createdAt))} ago
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 border rounded-lg">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
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
                      
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/leads/${message.lead.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Lead
                        </Link>
                      </Button>
                      
                      {message.lead.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={`mailto:${message.lead.email}?subject=Business Opportunity&body=${encodeURIComponent(message.content)}`}
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
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
