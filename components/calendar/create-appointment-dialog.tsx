
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CalendarDays, Sparkles } from 'lucide-react'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { PlaceAutocomplete } from '@/components/ui/place-autocomplete'
import { getIndustryBookingConfig } from '@/lib/industry-booking-config'
import type { BookingField } from '@/lib/industry-booking-config'

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
  const { data: session } = useSession() || {}
  const industry = (session?.user as any)?.industry || null
  const config = getIndustryBookingConfig(industry)

  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Lead[]>([])
  const [contactType, setContactType] = useState<'lead' | 'contact'>('lead')
  const [industryFields, setIndustryFields] = useState<Record<string, string>>({})

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
      setIndustryFields({})
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
        setLeads(Array.isArray(data) ? data : (data.leads || []))
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(Array.isArray(data) ? data : (data.contacts || []))
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const handleIndustryFieldChange = (fieldId: string, value: string) => {
    setIndustryFields(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedId = contactType === 'lead' ? formData.leadId : formData.contactId
    if (!selectedId || selectedId === '' || selectedId === 'none') {
      toast.error(`Please select a ${contactType} for this ${config.bookingNoun.toLowerCase()}`)
      return
    }

    const startDate = new Date(formData.startTime)
    if (startDate < new Date()) {
      toast.error(`Cannot create a ${config.bookingNoun.toLowerCase()} in the past`)
      return
    }

    const endDate = new Date(formData.endTime)
    if (endDate <= startDate) {
      toast.error('End time must be after start time')
      return
    }

    setLoading(true)

    try {
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

      if (contactType === 'lead' && formData.leadId && formData.leadId !== 'none') {
        appointmentData.leadId = formData.leadId
      } else if (contactType === 'contact' && formData.contactId && formData.contactId !== 'none') {
        appointmentData.contactId = formData.contactId
      }

      if (Object.keys(industryFields).length > 0) {
        const fieldEntries = Object.entries(industryFields)
          .filter(([, v]) => v && v !== 'none')
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
        if (fieldEntries) {
          appointmentData.notes = appointmentData.notes
            ? `${appointmentData.notes}\n\n--- ${config.bookingNoun} Details ---\n${fieldEntries}`
            : fieldEntries
        }
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      })

      if (response.ok) {
        toast.success(`${config.bookingNoun} created successfully`)
        onSuccess()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to create ${config.bookingNoun.toLowerCase()}`)
      }
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error(`Failed to create ${config.bookingNoun.toLowerCase()}`)
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
    setIndustryFields({})
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-purple-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/20">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Create New {config.bookingNoun}</span>
              {industry && (
                <Badge variant="secondary" className="ml-2 text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                  {industry.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-2">
              <Label className="text-purple-200 text-sm">Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`${config.bookingNoun} title`}
                required
                className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <Label className="text-purple-200 text-sm">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={`${config.bookingNoun} description`}
                rows={2}
                className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
              />
            </div>

            {/* Start / End Time */}
            <div>
              <Label className="text-purple-200 text-sm">Start Time *</Label>
              <DateTimePicker
                value={formData.startTime}
                onChange={(v) => setFormData(prev => ({ ...prev, startTime: v }))}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                placeholder="Select start date & time"
                className="mt-1.5"
                triggerClassName="bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50 focus:ring-purple-500/20"
                timeInputClassName="bg-gray-800/50 border-gray-700/50 text-white"
                popoverClassName="bg-gray-900 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-purple-200 text-sm">End Time *</Label>
              <DateTimePicker
                value={formData.endTime}
                onChange={(v) => setFormData(prev => ({ ...prev, endTime: v }))}
                min={formData.startTime || format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                placeholder="Select end date & time"
                className="mt-1.5"
                triggerClassName="bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50 focus:ring-purple-500/20"
                timeInputClassName="bg-gray-800/50 border-gray-700/50 text-white"
                popoverClassName="bg-gray-900 border-gray-700"
              />
            </div>

            {/* Meeting Type */}
            <div>
              <Label className="text-purple-200 text-sm">Meeting Type</Label>
              <Select value={formData.meetingType} onValueChange={(value) => setFormData(prev => ({ ...prev, meetingType: value }))}>
                <SelectTrigger className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="IN_PERSON" className="text-gray-200 focus:bg-purple-500/20 focus:text-white">In Person</SelectItem>
                  <SelectItem value="VIDEO_CALL" className="text-gray-200 focus:bg-purple-500/20 focus:text-white">Video Call</SelectItem>
                  <SelectItem value="PHONE_CALL" className="text-gray-200 focus:bg-purple-500/20 focus:text-white">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label className="text-purple-200 text-sm">Location / Address</Label>
              <PlaceAutocomplete
                value={formData.location}
                onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                placeholder="Search address or paste meeting link"
                types="geocode"
                className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
              />
            </div>

            {/* Contact Type Selector */}
            <div className="col-span-2">
              <Label className="text-purple-200 text-sm">Select Type <span className="text-red-400">*</span></Label>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setContactType('lead'); setFormData(prev => ({ ...prev, contactId: '', leadId: '' })) }}
                  className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    contactType === 'lead'
                      ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-500/10'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}>
                  Lead
                </button>
                <button type="button" onClick={() => { setContactType('contact'); setFormData(prev => ({ ...prev, leadId: '', contactId: '' })) }}
                  className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    contactType === 'contact'
                      ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-500/10'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}>
                  Contact
                </button>
              </div>
            </div>

            {/* Lead/Contact Select */}
            <div className="col-span-2">
              {contactType === 'lead' ? (
                <>
                  <Label className="text-purple-200 text-sm">Select Lead <span className="text-red-400">*</span></Label>
                  <Select value={formData.leadId || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, leadId: value === "none" ? "" : value }))} required>
                    <SelectTrigger className={`mt-1.5 bg-gray-800/50 border-gray-700/50 text-white ${!formData.leadId ? 'border-red-500/30' : ''}`}>
                      <SelectValue placeholder="Select a lead" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="none" disabled className="text-gray-500">{leads.length === 0 ? 'No leads available' : 'Select a lead'}</SelectItem>
                      {leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id} className="text-gray-200 focus:bg-purple-500/20 focus:text-white">
                          {lead.businessName || lead.contactPerson} - {lead.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leads.length === 0 && <p className="text-xs text-yellow-400/80 mt-1.5">No leads found. Please create a lead first.</p>}
                </>
              ) : (
                <>
                  <Label className="text-purple-200 text-sm">Select Contact <span className="text-red-400">*</span></Label>
                  <Select value={formData.contactId || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, contactId: value === "none" ? "" : value }))} required>
                    <SelectTrigger className={`mt-1.5 bg-gray-800/50 border-gray-700/50 text-white ${!formData.contactId ? 'border-red-500/30' : ''}`}>
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="none" disabled className="text-gray-500">{contacts.length === 0 ? 'No contacts available' : 'Select a contact'}</SelectItem>
                      {contacts.map(contact => (
                        <SelectItem key={contact.id} value={contact.id} className="text-gray-200 focus:bg-purple-500/20 focus:text-white">
                          {contact.businessName || contact.contactPerson} - {contact.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contacts.length === 0 && <p className="text-xs text-yellow-400/80 mt-1.5">No contacts found. Please create a contact first.</p>}
                </>
              )}
            </div>

            {/* Industry-specific fields */}
            {config.extraFields.length > 0 && (
              <div className="col-span-2 space-y-4 rounded-xl bg-purple-500/5 border border-purple-500/15 p-4">
                <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {config.bookingNoun} Details
                </h4>
                {config.extraFields.map((field) => (
                  <IndustryFieldInDialog
                    key={field.id}
                    field={field}
                    value={industryFields[field.id] || ''}
                    onChange={(val) => handleIndustryFieldChange(field.id, val)}
                  />
                ))}
              </div>
            )}

            {/* Reminder */}
            <div>
              <Label className="text-purple-200 text-sm">Reminder (minutes before)</Label>
              <Input
                type="number"
                value={formData.reminderMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, reminderMinutes: e.target.value }))}
                min="0"
                className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
              />
            </div>

            {/* Payment Toggle */}
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="requiresPayment"
                checked={formData.requiresPayment}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresPayment: checked }))}
              />
              <Label htmlFor="requiresPayment" className="cursor-pointer text-purple-200 text-sm">Requires Payment</Label>
            </div>

            {formData.requiresPayment && (
              <div className="col-span-2">
                <Label className="text-purple-200 text-sm">Payment Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                />
              </div>
            )}

            {/* Notes */}
            <div className="col-span-2">
              <Label className="text-purple-200 text-sm">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
                className="mt-1.5 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary hover:opacity-90 text-white shadow-lg shadow-purple-500/30">
              {loading ? 'Creating...' : `Create ${config.bookingNoun}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function IndustryFieldInDialog({ field, value, onChange }: { field: BookingField; value: string; onChange: (val: string) => void }) {
  const labelSuffix = field.required ? ' *' : ''
  const inputClass = 'mt-1 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20'

  switch (field.type) {
    case 'select':
      return (
        <div>
          <Label className="text-purple-200/80 text-xs">{field.label}{labelSuffix}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={`${inputClass} mt-1`}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-gray-200 focus:bg-purple-500/20 focus:text-white">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case 'textarea':
      return (
        <div>
          <Label className="text-purple-200/80 text-xs">{field.label}{labelSuffix}</Label>
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={2} className={inputClass} />
        </div>
      )
    default:
      return (
        <div>
          <Label className="text-purple-200/80 text-xs">{field.label}{labelSuffix}</Label>
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={inputClass} />
        </div>
      )
  }
}
