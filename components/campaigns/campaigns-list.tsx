
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Send, Eye, Pencil, Trash2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CreateCampaignDialog } from './create-campaign-dialog'

interface Campaign {
  id: string
  name: string
  description?: string
  type: string
  status: string
  createdAt: string
  _count: {
    campaignLeads: number
    reviews: number
  }
}

export function CampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const router = useRouter()

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete campaign')

      toast.success('Campaign deleted successfully')
      fetchCampaigns()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Failed to delete campaign')
    }
  }

  const handleSend = async (id: string) => {
    if (!confirm('Send SMS messages to all pending leads in this campaign?')) return

    try {
      const response = await fetch(`/api/campaigns/${id}/send`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to send messages')

      const data = await response.json()
      toast.success(`Sent ${data.results.sent} messages. ${data.results.failed} failed.`)
      fetchCampaigns()
    } catch (error) {
      console.error('Error sending messages:', error)
      toast.error('Failed to send campaign messages')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'PAUSED':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'COMPLETED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'REVIEW_REQUEST':
        return 'Review Request'
      case 'REFERRAL_REQUEST':
        return 'Referral Request'
      case 'FOLLOW_UP':
        return 'Follow Up'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center bg-gray-900 border-gray-800">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-white">No campaigns yet</h3>
          <p className="text-gray-400 mb-4">
            Create your first SMS campaign to start collecting reviews and referrals
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6 bg-gray-900 border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                    <Badge variant="outline">{getTypeLabel(campaign.type)}</Badge>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-gray-400 mb-4">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{campaign._count.campaignLeads} leads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{campaign._count.reviews} reviews</span>
                    </div>
                    <div>
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {campaign.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      onClick={() => handleSend(campaign.id)}
                      className="gap-1"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(campaign.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateCampaignDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchCampaigns}
      />
    </div>
  )
}
