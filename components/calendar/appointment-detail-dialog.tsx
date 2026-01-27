
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Calendar, Clock, MapPin, User, Video, Phone, DollarSign, FileText, Trash2, Edit } from 'lucide-react'
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

interface AppointmentDetailDialogProps {
  open: boolean
  onClose: () => void
  appointment: any
  onUpdate: () => void
}

export function AppointmentDetailDialog({ open, onClose, appointment, onUpdate }: AppointmentDetailDialogProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!appointment) return null

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    CONFIRMED: 'bg-green-500/10 text-green-600 border-green-500/20',
    COMPLETED: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    NO_SHOW: 'bg-red-500/10 text-red-600 border-red-500/20',
    CANCELLED: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
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
        toast.success('Appointment status updated')
        onUpdate()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update appointment')
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to update appointment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Appointment cancelled')
        onUpdate()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error('Failed to cancel appointment')
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl mb-2">{appointment.title}</DialogTitle>
                <Badge className={statusColors[appointment.status]}>
                  {appointment.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" disabled>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Time and Location */}
            <Card className="p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium">Start Time</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(appointment.startTime), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium">End Time</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(appointment.endTime), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 mt-4">
                <MeetingIcon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">{appointment.meetingType.replace('_', ' ')}</div>
                  {appointment.location && (
                    <div className="text-sm text-muted-foreground">{appointment.location}</div>
                  )}
                </div>
              </div>
            </Card>

            {/* Customer Information */}
            {appointment.lead && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium mb-2">Customer</div>
                    <div className="space-y-1 text-sm">
                      <div><strong>Name:</strong> {appointment.lead.contactName}</div>
                      <div><strong>Business:</strong> {appointment.lead.businessName}</div>
                      <div><strong>Email:</strong> {appointment.lead.email}</div>
                      {appointment.lead.phone && <div><strong>Phone:</strong> {appointment.lead.phone}</div>}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Description */}
            {appointment.description && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium mb-2">Description</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {appointment.description}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Payment Information */}
            {appointment.requiresPayment && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium mb-2">Payment Required</div>
                    <div className="text-sm">
                      <div><strong>Amount:</strong> ${appointment.paymentAmount?.toFixed(2)}</div>
                      {appointment.payments && appointment.payments.length > 0 && (
                        <div className="mt-2">
                          <strong>Payment Status:</strong>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {appointment.payments.map((payment: any) => (
                              <Badge key={payment.id} variant="outline">
                                {payment.status} - ${payment.amount.toFixed(2)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Notes */}
            {appointment.notes && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium mb-2">Notes</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {appointment.notes}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Status Actions */}
            {appointment.status === 'SCHEDULED' && (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  disabled={loading}
                >
                  Confirm Appointment
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
                className="w-full"
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={loading}
              >
                Mark as Completed
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment and notify the customer if applicable. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              Yes, cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
