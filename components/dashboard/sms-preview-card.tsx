"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface SmsDraft {
  contactName: string;
  to: string;
  message: string;
  leadId?: string;
}

interface SmsPreviewCardProps {
  draft: SmsDraft;
  onSend: () => Promise<void>;
  onSchedule: (scheduledFor: string) => Promise<void>;
}

export function SmsPreviewCard({ draft, onSend, onSchedule }: SmsPreviewCardProps) {
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
      <Card className="border-2 border-emerald-200 bg-emerald-50/30 overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-4 bg-emerald-100/50 border-b border-emerald-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-gray-900">SMS Draft</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs text-gray-500">To</Label>
            <p className="text-sm font-medium">{draft.contactName} ({draft.to})</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Message</Label>
            <div className="mt-1 p-3 rounded-lg bg-white border border-emerald-100 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
              {draft.message}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="bg-emerald-600 hover:bg-emerald-700"
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
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
            <DialogTitle>Schedule SMS</DialogTitle>
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
