
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface CreateAppointmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  initialDate?: Date | null
}

interface Lead {
  id: string
  businessName: string
  contactPerson: string
  email: string
  phone: string
}

export function CreateAppointmentDialog({ open, onClose, onSuccess, initialDate }: CreateAppointmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Lead[]>([])
  const [contactType, setContactType] = useState<'lead' | 'contact'>('lead')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    leadId: '',
    contactId: '',
    meetingType: 'IN_PERSON',
    requiresPayment: false,
    paymentAmount: '',
    reminderMinutes: '30',
    notes: '',
  })

  useEffect(() => {
    if (open) {
      fetchLeads()
      fetchContacts()
      if (initialDate) {
        const date = format(initialDate, 'yyyy-MM-dd')
        setFormData(prev => ({
          ...prev,
          startTime: `${date}T09:00`,
          endTime: `${date}T10:00`,
        }))
      }
    }
  }, [open, initialDate])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads')
      if (response.ok) {
        const data = await response.json()
        // API returns array directly, not wrapped in an object
        const leadsArray = Array.isArray(data) ? data : (data.leads || [])
        console.log('✅ Fetched leads:', leadsArray.length)
        setLeads(leadsArray)
      }
    } catch (error) {
      console.error('❌ Error fetching leads:', error)
      toast.error('Failed to load leads')
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        // API returns array directly, not wrapped in an object
        const contactsArray = Array.isArray(data) ? data : (data.contacts || [])
        console.log('✅ Fetched contacts:', contactsArray.length)
        setContacts(contactsArray)
      }
    } catch (error) {
      console.error('❌ Error fetching contacts:', error)
      toast.error('Failed to load contacts')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: Check if lead or contact is selected
    const selectedId = contactType === 'lead' ? formData.leadId : formData.contactId
    console.log('🔍 Validating selection:', { contactType, leadId: formData.leadId, contactId: formData.contactId, selectedId })
    
    if (!selectedId || selectedId === '' || selectedId === 'none') {
      toast.error(`Please select a ${contactType === 'lead' ? 'lead' : 'contact'} for this appointment`)
      return
    }

    // Validation: Check if start time is in the past
    const startDate = new Date(formData.startTime)
    const now = new Date()
    if (startDate < now) {
      toast.error('Cannot create an appointment in the past')
      return
    }

    // Validation: Check if end time is after start time
    const endDate = new Date(formData.endTime)
    if (endDate <= startDate) {
      toast.error('End time must be after start time')
      return
    }

    setLoading(true)

    try {
      // Prepare data based on contact type - only send the relevant ID
      const appointmentData: any = {
        title: formData.title,
        description: formData.description,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location,
        meetingType: formData.meetingType,
        requiresPayment: formData.requiresPayment,
        notes: formData.notes,
      }
      
      // Only include the selected ID type
      if (contactType === 'lead' && formData.leadId && formData.leadId !== 'none') {
        appointmentData.leadId = formData.leadId
      } else if (contactType === 'contact' && formData.contactId && formData.contactId !== 'none') {
        appointmentData.contactId = formData.contactId
      }
      
      console.log('📤 Sending appointment data:', appointmentData)

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      })

      if (response.ok) {
        toast.success('Appointment created successfully')
        onSuccess()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        console.error('❌ API Error:', error)
        toast.error(error.error || 'Failed to create appointment')
      }
    } catch (error) {
      console.error('❌ Error creating appointment:', error)
      toast.error('Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      leadId: '',
      contactId: '',
      meetingType: 'IN_PERSON',
      requiresPayment: false,
      paymentAmount: '',
      reminderMinutes: '30',
      notes: '',
    })
    setContactType('lead')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Appointment title"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Appointment description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                required
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                min={formData.startTime || format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                required
              />
            </div>

            <div>
              <Label htmlFor="meetingType">Meeting Type</Label>
              <Select
                value={formData.meetingType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, meetingType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PERSON">In Person</SelectItem>
                  <SelectItem value="VIDEO_CALL">Video Call</SelectItem>
                  <SelectItem value="PHONE_CALL">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Meeting location or link"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-white">
                Select Type <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-4 mb-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setContactType('lead')
                    setFormData(prev => ({ ...prev, contactId: '', leadId: '' }))
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                    contactType === 'lead'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  Lead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContactType('contact')
                    setFormData(prev => ({ ...prev, leadId: '', contactId: '' }))
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                    contactType === 'contact'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  Contact
                </button>
              </div>

              {contactType === 'lead' ? (
                <>
                  <Label htmlFor="leadId" className="text-white">
                    Select Lead <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.leadId || "none"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, leadId: value === "none" ? "" : value }))}
                    required
                  >
                    <SelectTrigger className={!formData.leadId ? "border-red-500/50" : ""}>
                      <SelectValue placeholder="Select a lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        {leads.length === 0 ? "No leads available" : "Select a lead"}
                      </SelectItem>
                      {leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.businessName || lead.contactPerson} - {lead.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leads.length === 0 && (
                    <p className="text-sm text-yellow-500 mt-1">
                      ⚠️ No leads found. Please create a lead first.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Label htmlFor="contactId" className="text-white">
                    Select Contact <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.contactId || "none"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, contactId: value === "none" ? "" : value }))}
                    required
                  >
                    <SelectTrigger className={!formData.contactId ? "border-red-500/50" : ""}>
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        {contacts.length === 0 ? "No contacts available" : "Select a contact"}
                      </SelectItem>
                      {contacts.map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.businessName || contact.contactPerson} - {contact.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contacts.length === 0 && (
                    <p className="text-sm text-yellow-500 mt-1">
                      ⚠️ No contacts found. Please create a contact first.
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <Label htmlFor="reminderMinutes">Reminder (minutes before)</Label>
              <Input
                id="reminderMinutes"
                type="number"
                value={formData.reminderMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, reminderMinutes: e.target.value }))}
                min="0"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="requiresPayment"
                checked={formData.requiresPayment}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresPayment: checked }))}
              />
              <Label htmlFor="requiresPayment" className="cursor-pointer">Requires Payment</Label>
            </div>

            {formData.requiresPayment && (
              <div className="col-span-2">
                <Label htmlFor="paymentAmount">Payment Amount ($)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
