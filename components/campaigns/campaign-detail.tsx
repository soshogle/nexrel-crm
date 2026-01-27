
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Send, Users, MessageSquare, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface CampaignDetailProps {
  campaignId: string
}

export function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchCampaign()
  }, [campaignId])

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`)
      if (!response.ok) throw new Error('Failed to fetch campaign')
      const data = await response.json()
      setCampaign(data.campaign)
    } catch (error) {
      console.error('Error fetching campaign:', error)
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'RESPONDED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'FAILED':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>
  }

  if (!campaign) {
    return <div className="text-center py-12">Campaign not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/campaigns">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-muted-foreground mt-1">{campaign.description}</p>
          )}
        </div>
        <Badge className={getStatusColor(campaign.status)}>
          {campaign.status}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-white">{campaign.campaignLeads.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <MessageSquare className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Sent</p>
              <p className="text-2xl font-bold text-white">
                {campaign.campaignLeads.filter((cl: any) => cl.status === 'SENT' || cl.status === 'DELIVERED').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Star className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Reviews</p>
              <p className="text-2xl font-bold text-white">{campaign.reviews.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* SMS Template */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h3 className="font-semibold mb-3 text-white">SMS Template</h3>
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-md">
          <p className="text-sm whitespace-pre-wrap text-gray-100">{campaign.smsTemplate}</p>
        </div>
        {campaign.reviewUrl && (
          <div className="mt-3">
            <p className="text-sm text-gray-400">Review URL:</p>
            <a
              href={campaign.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {campaign.reviewUrl}
            </a>
          </div>
        )}
      </Card>

      {/* Campaign Leads */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h3 className="font-semibold mb-4 text-white">Campaign Leads</h3>
        <div className="space-y-3">
          {campaign.campaignLeads.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No leads in this campaign
            </p>
          ) : (
            campaign.campaignLeads.map((cl: any) => (
              <div
                key={cl.id}
                className="flex items-center justify-between p-4 border border-gray-700 bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-white">{cl.lead.businessName}</p>
                  {cl.lead.contactPerson && (
                    <p className="text-sm text-gray-400">
                      {cl.lead.contactPerson}
                    </p>
                  )}
                  {cl.lead.phone && (
                    <p className="text-sm text-gray-400">{cl.lead.phone}</p>
                  )}
                  {cl.sentAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Sent: {new Date(cl.sentAt).toLocaleString()}
                    </p>
                  )}
                  {cl.errorMessage && (
                    <p className="text-xs text-red-400 mt-1">
                      Error: {cl.errorMessage}
                    </p>
                  )}
                </div>
                <Badge className={getStatusColor(cl.status)}>
                  {cl.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Reviews */}
      {campaign.reviews.length > 0 && (
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h3 className="font-semibold mb-4 text-white">Reviews Received</h3>
          <div className="space-y-3">
            {campaign.reviews.map((review: any) => (
              <div key={review.id} className="p-4 border border-gray-700 bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{review.lead.businessName}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <Badge variant="outline">{review.source}</Badge>
                </div>
                {review.reviewText && (
                  <p className="text-sm text-gray-400">{review.reviewText}</p>
                )}
                {review.reviewUrl && (
                  <a
                    href={review.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-2 inline-block"
                  >
                    View Review
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
