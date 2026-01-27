
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface Lead {
  id: string
  businessName: string
  contactPerson?: string
  phone?: string
}

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateCampaignDialog({ open, onOpenChange, onSuccess }: CreateCampaignDialogProps) {
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'REVIEW_REQUEST',
    smsTemplate: 'Hi {contactPerson}, thanks for your business! We\'d love to hear your feedback. Please leave us a review: {reviewUrl}',
    reviewUrl: '',
    referralReward: '',
  })

  useEffect(() => {
    if (open) {
      fetchLeads()
    }
  }, [open])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads')
      if (!response.ok) throw new Error('Failed to fetch leads')
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to load leads')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          leadIds: selectedLeads,
        }),
      })

      if (!response.ok) throw new Error('Failed to create campaign')

      toast.success('Campaign created successfully')
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'REVIEW_REQUEST',
      smsTemplate: 'Hi {contactPerson}, thanks for your business! We\'d love to hear your feedback. Please leave us a review: {reviewUrl}',
      reviewUrl: '',
      referralReward: '',
    })
    setSelectedLeads([])
  }

  const toggleLead = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Summer 2024 Review Campaign"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your campaign..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="type">Campaign Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REVIEW_REQUEST">Review Request</SelectItem>
                <SelectItem value="REFERRAL_REQUEST">Referral Request</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="smsTemplate">SMS Message Template *</Label>
            <Textarea
              id="smsTemplate"
              value={formData.smsTemplate}
              onChange={(e) => setFormData({ ...formData, smsTemplate: e.target.value })}
              placeholder="Use {businessName}, {contactPerson}, {reviewUrl}, {referralReward} as placeholders"
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available placeholders: {'{businessName}'}, {'{contactPerson}'}, {'{reviewUrl}'}, {'{referralReward}'}
            </p>
          </div>

          {formData.type === 'REVIEW_REQUEST' && (
            <div>
              <Label htmlFor="reviewUrl">Review URL</Label>
              <Input
                id="reviewUrl"
                type="url"
                value={formData.reviewUrl}
                onChange={(e) => setFormData({ ...formData, reviewUrl: e.target.value })}
                placeholder="https://g.page/your-business/review"
              />
            </div>
          )}

          {formData.type === 'REFERRAL_REQUEST' && (
            <div>
              <Label htmlFor="referralReward">Referral Reward</Label>
              <Input
                id="referralReward"
                value={formData.referralReward}
                onChange={(e) => setFormData({ ...formData, referralReward: e.target.value })}
                placeholder="e.g., $50 credit, 20% off next service"
              />
            </div>
          )}

          <div>
            <Label>Select Leads ({selectedLeads.length} selected)</Label>
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
              {leads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No leads available. Create some leads first.
                </p>
              ) : (
                leads.map((lead) => (
                  <div key={lead.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={lead.id}
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => toggleLead(lead.id)}
                    />
                    <label
                      htmlFor={lead.id}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {lead.businessName}
                      {lead.contactPerson && ` (${lead.contactPerson})`}
                      {!lead.phone && (
                        <span className="text-xs text-amber-500 ml-2">⚠️ No phone</span>
                      )}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
