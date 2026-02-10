
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Plus, 
  Search, 
  Grid, 
  List,
  Eye,
  Edit,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  MessageSquare,
  StickyNote,
  Linkedin,
  Sparkles,
  Loader2 as LoaderIcon,
  Instagram,
  Facebook,
  Music,
  Hash
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog'
import LinkedInScraperDialog from '@/components/linkedin-scraper/linkedin-scraper-dialog'
import SocialMediaScraperDialog from '@/components/leads/social-media-scraper-dialog'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Lead {
  id: string
  businessName: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  status: string
  source: string
  createdAt: Date
  notes: { id: string; createdAt: Date }[]
  messages: { id: string; createdAt: Date }[]
}

interface LeadsListProps {
  leads: Lead[]
}

export function LeadsList({ leads }: LeadsListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sourceFilter, setSourceFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [linkedInDialogOpen, setLinkedInDialogOpen] = useState(false)
  const [socialMediaDialogOpen, setSocialMediaDialogOpen] = useState(false)
  const [enrichingLeads, setEnrichingLeads] = useState<Set<string>>(new Set())

  const handleMakeCall = (lead: Lead) => {
    setSelectedLead(lead)
    setCallDialogOpen(true)
  }

  const handleLinkedInScraperSuccess = () => {
    // Refresh the page to show new leads
    router.refresh()
  }

  const handleSocialMediaScraperSuccess = () => {
    // Refresh the page to show new leads
    router.refresh()
    toast.success('New social media leads added successfully!')
  }

  const handleEnrichLead = async (leadId: string) => {
    setEnrichingLeads((prev) => new Set(prev).add(leadId))
    
    try {
      const response = await fetch('/api/leads/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('Lead enriched successfully!')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to enrich lead')
      }
    } catch (error: any) {
      console.error('Enrichment error:', error)
      toast.error('Failed to enrich lead')
    } finally {
      setEnrichingLeads((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter

    const matchesSource = sourceFilter === 'ALL' ||
      (sourceFilter === 'website' && (lead.source?.toLowerCase().includes('website') || lead.source === 'Website Form')) ||
      (sourceFilter !== 'website' && lead.source?.toLowerCase().includes(sourceFilter.toLowerCase()))

    return matchesSearch && matchesStatus && matchesSource
  })

  // Filter social media leads (from Instagram, Facebook, TikTok)
  const socialMediaLeads = filteredLeads.filter((lead) =>
    lead.source?.toLowerCase().includes('instagram') ||
    lead.source?.toLowerCase().includes('facebook') ||
    lead.source?.toLowerCase().includes('tiktok')
  )

  // Filter website leads (form submissions, etc.)
  const websiteLeads = filteredLeads.filter((lead) =>
    lead.source?.toLowerCase().includes('website') || lead.source === 'Website Form'
  )

  // Get stats for social media leads
  const socialMediaStats = {
    instagram: leads.filter(l => l.source?.toLowerCase().includes('instagram')).length,
    facebook: leads.filter(l => l.source?.toLowerCase().includes('facebook')).length,
    tiktok: leads.filter(l => l.source?.toLowerCase().includes('tiktok')).length,
  }

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

  const getSourceIcon = (source: string) => {
    if (source === 'google_places') return Globe
    if (source?.toLowerCase().includes('website') || source === 'Website Form') return Globe
    return Users
  }

  // Helper function to render leads content
  const renderLeadsContent = (leadsToShow: Lead[], emptyMessage: string) => (
    <>
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {leadsToShow.length} of {leads.length} leads
        </p>
      </div>

      {/* Empty State */}
      {leadsToShow.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-white">{emptyMessage}</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Start scraping social media to get your first leads'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && leadsToShow.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leadsToShow.map((lead, index) => {
            const SourceIcon = getSourceIcon(lead.source)
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-white mb-2">
                          {lead.businessName}
                        </CardTitle>
                        {lead.contactPerson && (
                          <p className="text-sm text-gray-400">{lead.contactPerson}</p>
                        )}
                      </div>
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2 mb-4">
                      {lead.email && (
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center text-sm text-gray-300">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {lead.phone}
                        </div>
                      )}
                      {lead.website && (
                        <div className="flex items-center text-sm text-gray-300">
                          <Globe className="h-4 w-4 mr-2 text-gray-400" />
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white hover:underline truncate"
                          >
                            {lead.website}
                          </a>
                        </div>
                      )}
                      {(lead.city || lead.address) && (
                        <div className="flex items-center text-sm text-gray-300">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {lead.city && lead.address
                            ? `${lead.city}, ${lead.address}`
                            : lead.city || lead.address}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                        <div className="flex items-center gap-1">
                          <SourceIcon className="h-3 w-3" />
                          {lead.source}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {lead.messages.length} messages
                        </div>
                        <div className="flex items-center gap-1">
                          <StickyNote className="h-3 w-3" />
                          {lead.notes.length} notes
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/dashboard/leads/${lead.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/dashboard/leads/${lead.id}/edit`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && leadsToShow.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-gray-900">
                    <TableHead className="text-gray-300">Business</TableHead>
                    <TableHead className="text-gray-300">Contact</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Phone</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Source</TableHead>
                    <TableHead className="text-gray-300">Created</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsToShow.map((lead) => {
                    const SourceIcon = getSourceIcon(lead.source)
                    return (
                      <TableRow key={lead.id} className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell className="text-white font-medium">{lead.businessName}</TableCell>
                        <TableCell className="text-gray-300">{lead.contactPerson || '-'}</TableCell>
                        <TableCell className="text-gray-300">{lead.email || '-'}</TableCell>
                        <TableCell className="text-gray-300">{lead.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-300">
                            <SourceIcon className="h-3 w-3" />
                            <span className="text-sm">{lead.source}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/leads/${lead.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/leads/${lead.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="RESPONDED">Responded</SelectItem>
                  <SelectItem value="QUALIFIED">Qualified</SelectItem>
                  <SelectItem value="CONVERTED">Converted</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-40 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="website">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </span>
                  </SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="messaging">Messaging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                variant="outline"
                onClick={() => setLinkedInDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 border-blue-500"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
              <Button 
                variant="outline"
                onClick={() => setSocialMediaDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Social Media
              </Button>
              <Button asChild>
                <Link href="/dashboard/leads/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Tabbed Content */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-[800px] grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            All Leads ({filteredLeads.length})
          </TabsTrigger>
          <TabsTrigger value="website" className="gap-2">
            <Globe className="h-4 w-4" />
            Website ({websiteLeads.length})
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Social Media ({socialMediaLeads.length})
          </TabsTrigger>
        </TabsList>

        {/* All Leads Tab */}
        <TabsContent value="all" className="space-y-6">
          {renderLeadsContent(filteredLeads, 'No leads yet')}
        </TabsContent>

        {/* Website Leads Tab */}
        <TabsContent value="website" className="space-y-6">
          {renderLeadsContent(websiteLeads, 'No website leads yet. Add a form to your website to capture leads.')}
        </TabsContent>

        {/* Social Media Leads Tab */}
        <TabsContent value="social" className="space-y-6">
          {/* Quick Launch Buttons */}
          <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-300">
                <Sparkles className="h-5 w-5" />
                Quick Launch Social Media Scrapers
              </CardTitle>
              <CardDescription>
                Scrape leads directly from top social platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/40 hover:border-purple-500 hover:bg-purple-900/60"
                  onClick={() => setSocialMediaDialogOpen(true)}
                >
                  <Instagram className="h-8 w-8 text-pink-400" />
                  <div>
                    <div className="font-semibold">Instagram</div>
                    <div className="text-xs text-gray-400">{socialMediaStats.instagram} leads</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-500/40 hover:border-blue-500 hover:bg-blue-900/60"
                  onClick={() => setSocialMediaDialogOpen(true)}
                >
                  <Facebook className="h-8 w-8 text-blue-400" />
                  <div>
                    <div className="font-semibold">Facebook</div>
                    <div className="text-xs text-gray-400">{socialMediaStats.facebook} leads</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-gray-900/40 to-gray-800/40 border-gray-500/40 hover:border-gray-400 hover:bg-gray-900/60"
                  onClick={() => setSocialMediaDialogOpen(true)}
                >
                  <Music className="h-8 w-8 text-gray-300" />
                  <div>
                    <div className="font-semibold">TikTok</div>
                    <div className="text-xs text-gray-400">{socialMediaStats.tiktok} leads</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {renderLeadsContent(socialMediaLeads, 'No social media leads yet')}
        </TabsContent>
      </Tabs>
      {/* Voice AI Call Dialog */}
      <MakeCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        defaultName={selectedLead?.contactPerson || selectedLead?.businessName || ''}
        defaultPhone={selectedLead?.phone || ''}
        defaultPurpose="Lead follow-up"
        leadId={selectedLead?.id}
      />

      {/* LinkedIn Scraper Dialog */}
      <LinkedInScraperDialog
        open={linkedInDialogOpen}
        onOpenChange={setLinkedInDialogOpen}
        onSuccess={handleLinkedInScraperSuccess}
      />

      {/* Social Media Scraper Dialog */}
      <SocialMediaScraperDialog
        open={socialMediaDialogOpen}
        onOpenChange={setSocialMediaDialogOpen}
        onSuccess={handleSocialMediaScraperSuccess}
      />
    </div>
  )
}