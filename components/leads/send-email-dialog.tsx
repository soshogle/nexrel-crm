'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, ExternalLink } from 'lucide-react'

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  leadId?: string
  leadName?: string
}

export function SendEmailDialog({
  open,
  onOpenChange,
  email,
  leadId,
  leadName,
}: SendEmailDialogProps) {
  const router = useRouter()

  const handleCrmEmail = () => {
    const params = new URLSearchParams()
    if (leadId) params.set('leadId', leadId)
    if (email) params.set('to', email)
    const query = params.toString()
    router.push(`/dashboard/messages${query ? `?${query}` : ''}`)
    onOpenChange(false)
  }

  const handleEmailClient = () => {
    window.location.href = `mailto:${email}`
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            How would you like to send an email
            {leadName ? ` to ${leadName}` : ''}?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Button
            variant="outline"
            className="h-auto p-4 justify-start gap-4"
            onClick={handleCrmEmail}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold">CRM Email System</div>
              <div className="text-sm text-muted-foreground">
                Compose and track emails within the CRM
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 justify-start gap-4"
            onClick={handleEmailClient}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold flex items-center gap-1.5">
                Email Client
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                Open in your default email app
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
