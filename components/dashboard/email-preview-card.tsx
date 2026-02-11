"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface EmailDraft {
  contactName: string;
  to: string;
  subject: string;
  body: string;
  leadId?: string;
}

interface EmailPreviewCardProps {
  draft: EmailDraft;
  onSend: () => Promise<void>;
  onSchedule: (scheduledFor: string) => Promise<void>;
}

export function EmailPreviewCard({ draft, onSend, onSchedule }: EmailPreviewCardProps) {
  const [sending, setSending] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend();
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDateTime) return;
    setScheduling(true);
    try {
      await onSchedule(scheduleDateTime);
      setShowScheduleDialog(false);
    } finally {
      setScheduling(false);
    }
  };

  const defaultSchedule = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  return (
    <>
      <Card className="border-2 border-blue-200 bg-blue-50/30 overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-4 bg-blue-100/50 border-b border-blue-200">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Email Draft</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs text-gray-500">To</Label>
            <p className="text-sm font-medium">{draft.contactName} &lt;{draft.to}&gt;</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Subject</Label>
            <p className="text-sm font-medium">{draft.subject}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Body</Label>
            <div className="mt-1 p-3 rounded-lg bg-white border border-blue-100 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
              {draft.body}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Send now"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setScheduleDateTime(defaultSchedule());
                setShowScheduleDialog(true);
              }}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Clock className="h-4 w-4" />
              Schedule for later
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="schedule-datetime">When to send</Label>
              <Input
                id="schedule-datetime"
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={scheduling || !scheduleDateTime}>
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
