
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Clock, MapPin, User, Video, Phone, DollarSign, FileText, Trash2, Edit, CheckCircle, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getIndustryBookingConfig } from '@/lib/industry-booking-config'

interface AppointmentDetailDialogProps {
  open: boolean
  onClose: () => void
  appointment: any
  onUpdate: () => void
}

export function AppointmentDetailDialog({ open, onClose, appointment, onUpdate }: AppointmentDetailDialogProps) {
  const { data: session } = useSession() || {}
  const industry = (session?.user as any)?.industry || null
  const config = getIndustryBookingConfig(industry)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!appointment) return null

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    CONFIRMED: 'bg-green-500/20 text-green-400 border-green-500/30',
    COMPLETED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    NO_SHOW: 'bg-red-500/20 text-red-400 border-red-500/30',
    CANCELLED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  }

  const meetingTypeIcons: Record<string, any> = {
    IN_PERSON: MapPin,
    VIDEO_CALL: Video,
    PHONE_CALL: Phone,
  }

  const MeetingIcon = meetingTypeIcons[appointment.meetingType] || MapPin

  const handleUpdateStatus = async (newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        toast.success(`${config.bookingNoun} status updated`)
        onUpdate()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to update ${config.bookingNoun.toLowerCase()}`)
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error(`Failed to update ${config.bookingNoun.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success(`${config.bookingNoun} cancelled`)
        onUpdate()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to cancel ${config.bookingNoun.toLowerCase()}`)
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error(`Failed to cancel ${config.bookingNoun.toLowerCase()}`)
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-gray-900 border-purple-500/20">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/20 mt-0.5">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl text-white mb-1.5">{appointment.title}</DialogTitle>
                  <Badge className={`${statusColors[appointment.status]} border`}>
                    {appointment.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" disabled className="border-gray-700 text-gray-500">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Time and Location */}
            <Card className="p-4 bg-gray-800/50 border-purple-500/10">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-200 text-sm">Start Time</div>
                    <div className="text-sm text-gray-400">
                      {format(new Date(appointment.startTime), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-200 text-sm">End Time</div>
                    <div className="text-sm text-gray-400">
                      {format(new Date(appointment.endTime), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 mt-4">
                <MeetingIcon className="h-5 w-5 text-purple-400 mt-0.5" />
                <div>
                  <div className="font-medium text-purple-200 text-sm">{appointment.meetingType.replace('_', ' ')}</div>
                  {appointment.location && <div className="text-sm text-gray-400">{appointment.location}</div>}
                </div>
              </div>
            </Card>

            {/* Customer */}
            {appointment.lead && (
              <Card className="p-4 bg-gray-800/50 border-purple-500/10">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-purple-200 text-sm mb-2">Customer</div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div><span className="text-purple-300/80">Name:</span> {appointment.lead.contactName || appointment.lead.contactPerson}</div>
                      <div><span className="text-purple-300/80">Business:</span> {appointment.lead.businessName}</div>
                      <div><span className="text-purple-300/80">Email:</span> {appointment.lead.email}</div>
                      {appointment.lead.phone && <div><span className="text-purple-300/80">Phone:</span> {appointment.lead.phone}</div>}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Description */}
            {appointment.description && (
              <Card className="p-4 bg-gray-800/50 border-purple-500/10">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-200 text-sm mb-1">Description</div>
                    <div className="text-sm text-gray-400 whitespace-pre-wrap">{appointment.description}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Payment */}
            {appointment.requiresPayment && (
              <Card className="p-4 bg-gray-800/50 border-purple-500/10">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-purple-200 text-sm mb-1">Payment Required</div>
                    <div className="text-sm text-gray-400">
                      <div>Amount: ${appointment.paymentAmount?.toFixed(2)}</div>
                      {Array.isArray(appointment?.payments) && appointment.payments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {appointment.payments.map((payment: any) => (
                            <Badge key={payment.id} className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                              {payment.status} - ${payment.amount.toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Notes */}
            {appointment.notes && (
              <Card className="p-4 bg-gray-800/50 border-purple-500/10">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-purple-200 text-sm mb-1">Notes</div>
                    <div className="text-sm text-gray-400 whitespace-pre-wrap">{appointment.notes}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Status Actions */}
            {appointment.status === 'SCHEDULED' && (
              <div className="flex gap-3">
                <Button
                  className="flex-1 gradient-primary hover:opacity-90 text-white shadow-lg shadow-purple-500/30"
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm {config.bookingNoun}
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  disabled={loading}
                >
                  Mark as Completed
                </Button>
              </div>
            )}

            {appointment.status === 'CONFIRMED' && (
              <Button
                className="w-full gradient-primary hover:opacity-90 text-white shadow-lg shadow-purple-500/30"
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-purple-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancel {config.bookingNoun}?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will cancel the {config.bookingNoun.toLowerCase()} and notify the customer if applicable. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white">
              Yes, cancel {config.bookingNoun.toLowerCase()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
