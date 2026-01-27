
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Lead {
  id: string
  businessName: string
  contactPerson?: string
}

interface CreateReferralDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateReferralDialog({ open, onOpenChange, onSuccess }: CreateReferralDialogProps) {
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [formData, setFormData] = useState({
    referrerId: '',
    referredName: '',
    referredEmail: '',
    referredPhone: '',
    notes: '',
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
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create referral')

      toast.success('Referral added successfully')
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error creating referral:', error)
      toast.error('Failed to create referral')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      referrerId: '',
      referredName: '',
      referredEmail: '',
      referredPhone: '',
      notes: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Referral</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="referrerId">Who referred this person? *</Label>
            <Select
              value={formData.referrerId}
              onValueChange={(value) => setFormData({ ...formData, referrerId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a lead..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.businessName}
                    {lead.contactPerson && ` (${lead.contactPerson})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="referredName">Referred Person Name *</Label>
            <Input
              id="referredName"
              value={formData.referredName}
              onChange={(e) => setFormData({ ...formData, referredName: e.target.value })}
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <Label htmlFor="referredEmail">Email</Label>
            <Input
              id="referredEmail"
              type="email"
              value={formData.referredEmail}
              onChange={(e) => setFormData({ ...formData, referredEmail: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <Label htmlFor="referredPhone">Phone</Label>
            <Input
              id="referredPhone"
              type="tel"
              value={formData.referredPhone}
              onChange={(e) => setFormData({ ...formData, referredPhone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information about this referral..."
              rows={3}
            />
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
              {loading ? 'Adding...' : 'Add Referral'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
