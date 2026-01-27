
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Building,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Star,
  Calendar,
  Tag,
  MessageSquare,
  StickyNote,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { NotesSection } from '@/components/notes/notes-section'
import { MessagesSection } from '@/components/messages/messages-section'
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog'
import { RelationshipGraphView } from '@/app/components/relationship-graph-view'
import { AIInsightsPanel } from '@/app/components/ai-insights-panel'

interface Lead {
  id: string
  businessName: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  country?: string | null
  businessCategory?: string | null
  googlePlaceId?: string | null
  rating?: number | null
  status: string
  source: string
  createdAt: Date
  updatedAt: Date
  notes: Array<{
    id: string
    content: string
    createdAt: Date
    updatedAt: Date
  }>
  messages: Array<{
    id: string
    content: string
    messageType: string
    isUsed: boolean
    createdAt: Date
    updatedAt: Date
  }>
}

interface LeadDetailProps {
  lead: Lead
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(lead.status)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showCallDialog, setShowCallDialog] = useState(false)

  const getStatusColor = (status: string) => {
    const colors = {
      NEW: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      CONTACTED: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      RESPONDED: 'bg-green-500/20 text-green-300 border border-green-500/30',
      QUALIFIED: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      CONVERTED: 'bg-green-500/20 text-green-300 border border-green-500/30',
      LOST: 'bg-red-500/20 text-red-300 border border-red-500/30',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-700 text-gray-300'
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return
    
    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setCurrentStatus(newStatus)
      } else {
        console.error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/dashboard/leads')
      } else {
        console.error('Failed to delete lead')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
    }
  }

  const fullAddress = [lead.address, lead.city, lead.state, lead.zipCode, lead.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Link>
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/leads/${lead.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl flex items-center text-white">
                      <Building className="h-6 w-6 mr-3" />
                      {lead.businessName}
                    </CardTitle>
                    {lead.businessCategory && (
                      <div className="flex items-center text-gray-400">
                        <Tag className="h-4 w-4 mr-2" />
                        <span className="capitalize">{lead.businessCategory.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="capitalize text-gray-300 border-gray-600">
                      {lead.source.replace('_', ' ')}
                    </Badge>
                    <Badge className={getStatusColor(currentStatus)}>
                      {currentStatus.toLowerCase()}
                    </Badge>
                    {lead.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm text-gray-300">{lead.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.contactPerson && (
                    <div className="flex items-center text-sm text-gray-300">
                      <User className="h-4 w-4 mr-3 text-gray-400" />
                      <span>{lead.contactPerson}</span>
                    </div>
                  )}
                  
                  {lead.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-3 text-gray-400" />
                      <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  
                  {lead.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-3 text-gray-400" />
                      <a href={`tel:${lead.phone}`} className="text-blue-400 hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  
                  {lead.website && (
                    <div className="flex items-center text-sm">
                      <Globe className="h-4 w-4 mr-3 text-gray-400" />
                      <a 
                        href={lead.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center"
                      >
                        {lead.website}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Address */}
                {fullAddress && (
                  <div className="flex items-start text-sm pt-2 border-t border-gray-700 text-gray-300">
                    <MapPin className="h-4 w-4 mr-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{fullAddress}</span>
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div>
                    Updated {format(new Date(lead.updatedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <StickyNote className="h-5 w-5 mr-2" />
                  Notes
                  <Badge variant="secondary" className="ml-2">
                    {lead.notes.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Add notes and track communication history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotesSection leadId={lead.id} notes={lead.notes} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Messages Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  AI Messages
                  <Badge variant="secondary" className="ml-2">
                    {lead.messages.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  AI-generated personalized outreach messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessagesSection leadId={lead.id} messages={lead.messages} lead={lead} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Actions & Status */}
        <div className="space-y-6">
          {/* Status Management */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Lead Status</CardTitle>
                <CardDescription className="text-gray-400">
                  Update the current status of this lead
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={currentStatus} 
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="RESPONDED">Responded</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="CONVERTED">Converted</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">
                  Common actions for this lead
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start">
                  <Link href={`/dashboard/messages/generate?leadId=${lead.id}`}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Message
                  </Link>
                </Button>
                
                {lead.email && (
                  <Button asChild variant="outline" className="w-full justify-start">
                    <a href={`mailto:${lead.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </a>
                  </Button>
                )}
                
                {lead.phone && (
                  <>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <a href={`tel:${lead.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setShowCallDialog(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Call with Voice AI
                    </Button>
                  </>
                )}
                
                {lead.website && (
                  <Button asChild variant="outline" className="w-full justify-start">
                    <a href={lead.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Activity Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <Badge variant="secondary">{lead.notes.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">AI Messages</span>
                  <Badge variant="secondary">{lead.messages.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Messages Used</span>
                  <Badge variant="secondary">
                    {lead.messages.filter(m => m.isUsed).length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Insights Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <AIInsightsPanel entityType="LEAD" entityId={lead.id} />
          </motion.div>
        </div>

        {/* Relationship Graph View - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <RelationshipGraphView entityType="LEAD" entityId={lead.id} />
        </motion.div>
      </div>

      {/* Voice AI Call Dialog */}
      <MakeCallDialog
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
        defaultName={lead.contactPerson || lead.businessName}
        defaultPhone={lead.phone || ''}
        defaultPurpose={`Follow up with ${lead.businessName}`}
        leadId={lead.id}
      />
    </div>
  )
}
