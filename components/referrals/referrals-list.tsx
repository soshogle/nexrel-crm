
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle, XCircle, Clock, Phone, Mail, User2 } from 'lucide-react'
import { toast } from 'sonner'
import { CreateReferralDialog } from './create-referral-dialog'

interface Referral {
  id: string
  referredName: string
  referredEmail?: string
  referredPhone?: string
  status: string
  rewardGiven: boolean
  rewardDetails?: string
  notes?: string
  createdAt: string
  referrer: {
    id: string
    businessName: string
    contactPerson?: string
  }
  convertedLead?: {
    id: string
    businessName: string
    status: string
  }
}

export function ReferralsList() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/referrals')
      if (!response.ok) throw new Error('Failed to fetch referrals')
      const data = await response.json()
      setReferrals(data.referrals || [])
    } catch (error) {
      console.error('Error fetching referrals:', error)
      toast.error('Failed to load referrals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReferrals()
  }, [])

  const handleConvert = async (referralId: string, referredName: string) => {
    if (!confirm(`Convert "${referredName}" into a lead?`)) return

    try {
      const response = await fetch(`/api/referrals/${referralId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadData: {
            businessName: referredName,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to convert referral')

      toast.success('Referral converted to lead successfully')
      fetchReferrals()
    } catch (error) {
      console.error('Error converting referral:', error)
      toast.error('Failed to convert referral')
    }
  }

  const handleUpdateStatus = async (referralId: string, status: string) => {
    try {
      const response = await fetch(`/api/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      toast.success('Status updated successfully')
      fetchReferrals()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'CONTACTED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'EXPIRED':
      case 'DECLINED':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return <CheckCircle className="h-4 w-4" />
      case 'EXPIRED':
      case 'DECLINED':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading referrals...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Referral
        </Button>
      </div>

      {referrals.length === 0 ? (
        <Card className="p-12 text-center bg-gray-900 border-gray-800">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <User2 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-white">No referrals yet</h3>
          <p className="text-gray-400 mb-4">
            Start tracking referrals from your satisfied customers
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Referral
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {referrals.map((referral) => (
            <Card key={referral.id} className="p-6 bg-gray-900 border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-white">{referral.referredName}</h3>
                    <Badge className={getStatusColor(referral.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(referral.status)}
                        {referral.status}
                      </span>
                    </Badge>
                    {referral.rewardGiven && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                        Reward Given
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <User2 className="h-4 w-4" />
                      <span>Referred by: <strong className="text-gray-200">{referral.referrer.businessName}</strong></span>
                    </div>
                    {referral.referredEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{referral.referredEmail}</span>
                      </div>
                    )}
                    {referral.referredPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{referral.referredPhone}</span>
                      </div>
                    )}
                    {referral.notes && (
                      <div className="mt-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
                        <p className="text-sm text-gray-200">{referral.notes}</p>
                      </div>
                    )}
                    {referral.convertedLead && (
                      <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                        <p className="text-sm text-green-400">
                          ✓ Converted to lead: <strong>{referral.convertedLead.businessName}</strong>
                        </p>
                      </div>
                    )}
                    {referral.rewardDetails && (
                      <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <p className="text-sm text-blue-400">
                          🎁 Reward: {referral.rewardDetails}
                        </p>
                      </div>
                    )}
                    <div className="text-xs">
                      Created {new Date(referral.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {referral.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(referral.id, 'CONTACTED')}
                      >
                        Mark Contacted
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConvert(referral.id, referral.referredName)}
                      >
                        Convert to Lead
                      </Button>
                    </>
                  )}
                  {referral.status === 'CONTACTED' && (
                    <Button
                      size="sm"
                      onClick={() => handleConvert(referral.id, referral.referredName)}
                    >
                      Convert to Lead
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateReferralDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchReferrals}
      />
    </div>
  )
}
