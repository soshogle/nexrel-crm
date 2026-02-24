
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  Hash,
  Wand2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog'
import { SendEmailDialog } from '@/components/leads/send-email-dialog'
import LinkedInScraperDialog from '@/components/linkedin-scraper/linkedin-scraper-dialog'
import SocialMediaScraperDialog from '@/components/leads/social-media-scraper-dialog'
import { LeadResearchCard } from '@/components/leads/lead-research-card'
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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailDialogLead, setEmailDialogLead] = useState<Lead | null>(null)
  const [enrichingLeads, setEnrichingLeads] = useState<Set<string>>(new Set())

  const handleMakeCall = (lead: Lead) => {
    setSelectedLead(lead)
    setCallDialogOpen(true)
  }

  const handleSendEmail = (lead: Lead) => {
    setEmailDialogLead(lead)
    setEmailDialogOpen(true)
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
    return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground'
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
        <Card className="bg-card border">
          <CardContent className="p-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">{emptyMessage}</h3>
              <p className="text-muted-foreground mb-6">
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
                <Card className="bg-primary border-primary-foreground/20 hover:border-primary-foreground/40 transition-colors h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-primary-foreground mb-2">
                          {lead.businessName}
                        </CardTitle>
                        {lead.contactPerson && (
                          <p className="text-sm text-primary-foreground/80">{lead.contactPerson}</p>
                        )}
                      </div>
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2 mb-4">
                      {lead.email && (
                        <div className="flex items-center text-sm text-primary-foreground/90">
                          <Mail className="h-4 w-4 mr-2 text-primary-foreground/60" />
                          {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center text-sm text-primary-foreground/90">
                          <Phone className="h-4 w-4 mr-2 text-primary-foreground/60" />
                          {lead.phone}
                        </div>
                      )}
                      {lead.website && (
                        <div className="flex items-center text-sm text-primary-foreground/90">
                          <Globe className="h-4 w-4 mr-2 text-primary-foreground/60" />
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary-foreground hover:underline truncate"
                          >
                            {lead.website}
                          </a>
                        </div>
                      )}
                      {(lead.city || lead.address) && (
                        <div className="flex items-center text-sm text-primary-foreground/90">
                          <MapPin className="h-4 w-4 mr-2 text-primary-foreground/60" />
                          {lead.city && lead.address
                            ? `${lead.city}, ${lead.address}`
                            : lead.city || lead.address}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-primary-foreground/70 pt-2">
                        <div className="flex items-center gap-1">
                          <SourceIcon className="h-3 w-3" />
                          {lead.source}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-primary-foreground/70 pt-1">
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
                    <div className="flex flex-wrap gap-2">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); handleEnrichLead(lead.id); }}
                        disabled={enrichingLeads.has(lead.id)}
                        className="flex-1"
                        title="Enrich with Hunter.io (find email, company info)"
                      >
                        {enrichingLeads.has(lead.id) ? (
                          <LoaderIcon className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-1" />
                        )}
                        Enrich
                      </Button>
                      {lead.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.preventDefault(); handleSendEmail(lead); }}
                          className="flex-1"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                      )}
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
        <Card className="bg-card border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-muted-foreground">Business</TableHead>
                    <TableHead className="text-muted-foreground">Contact</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Phone</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Source</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsToShow.map((lead) => {
                    const SourceIcon = getSourceIcon(lead.source)
                    return (
                      <TableRow key={lead.id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-foreground font-medium">{lead.businessName}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.contactPerson || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.email || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <SourceIcon className="h-3 w-3" />
                            <span className="text-sm">{lead.source}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnrichLead(lead.id)}
                              disabled={enrichingLeads.has(lead.id)}
                              title="Enrich with Hunter.io (find email, company info)"
                            >
                              {enrichingLeads.has(lead.id) ? (
                                <LoaderIcon className="h-4 w-4 animate-spin" />
                              ) : (
                                <Wand2 className="h-4 w-4" />
                              )}
                            </Button>
                            {lead.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendEmail(lead)}
                                title="Send email"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
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
      <Card className="bg-card border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted border-input text-foreground"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40 bg-muted border-input text-foreground">
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
                <SelectTrigger className="w-full md:w-40 bg-muted border-input text-foreground">
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      disabled
                      className="opacity-50 cursor-not-allowed bg-muted border-input text-muted-foreground"
                    >
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upgrade - Contact Sales</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      disabled
                      className="opacity-50 cursor-not-allowed bg-muted border-input text-muted-foreground"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Social Media
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upgrade - Contact Sales</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
        <TabsList className="grid w-full max-w-[1000px] grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            All Leads ({filteredLeads.length})
          </TabsTrigger>
          <TabsTrigger value="website" className="gap-2">
            <Globe className="h-4 w-4" />
            Website ({websiteLeads.length})
          </TabsTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="social" className="gap-2 opacity-60 data-[state=inactive]:opacity-60">
                  <Sparkles className="h-4 w-4" />
                  Social Media ({socialMediaLeads.length})
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upgrade - Contact Sales</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="lead-finder" className="gap-2 opacity-60 data-[state=inactive]:opacity-60">
                  <Search className="h-4 w-4" />
                  Lead Finder
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upgrade - Contact Sales</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TabsList>

        {/* All Leads Tab */}
        <TabsContent value="all" className="space-y-6">
          {renderLeadsContent(filteredLeads, 'No leads yet')}
        </TabsContent>

        {/* Website Leads Tab */}
        <TabsContent value="website" className="space-y-6">
          {renderLeadsContent(websiteLeads, 'No website leads yet. Add a form to your website to capture leads.')}
        </TabsContent>

        {/* Social Media Leads Tab - Greyed out for all industries */}
        <TabsContent value="social" className="space-y-6">
          {/* Quick Launch Buttons - disabled */}
          <Card className="bg-primary/10 border-primary/30 opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Quick Launch Soshogle Lead Finders
              </CardTitle>
              <CardDescription>
                Find leads directly from top social platforms (Coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 opacity-50 pointer-events-none">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-primary/20 border-primary/40" disabled>
                  <Instagram className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-semibold">Instagram</div>
                    <div className="text-xs text-muted-foreground">{socialMediaStats.instagram} leads</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-primary/20 border-primary/40" disabled>
                  <Facebook className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-semibold">Facebook</div>
                    <div className="text-xs text-muted-foreground">{socialMediaStats.facebook} leads</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-muted border-border" disabled>
                  <Music className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">TikTok</div>
                    <div className="text-xs text-muted-foreground">{socialMediaStats.tiktok} leads</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {renderLeadsContent(socialMediaLeads, 'No social media leads yet')}
        </TabsContent>

        {/* Lead Finder Tab - Greyed out for all industries, contains Lead Research & Enrichment */}
        <TabsContent value="lead-finder" className="space-y-6">
          <div className="opacity-60 pointer-events-none">
            <LeadResearchCard />
          </div>
          <p className="text-sm text-muted-foreground text-center">Lead Finder (Coming soon)</p>
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

      {/* Send Email Choice Dialog */}
      {emailDialogLead?.email && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          email={emailDialogLead.email}
          leadId={emailDialogLead.id}
          leadName={emailDialogLead.contactPerson || emailDialogLead.businessName}
        />
      )}
    </div>
  )
}