'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CallHistoryPanel from '@/components/messaging/call-history-panel';
import { Phone, History, Plus } from 'lucide-react';

export default function VoiceAgentPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
            <p className="text-muted-foreground">View and manage your voice call history</p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/voice-agents">
            <Plus className="h-4 w-4" />
            Create Voice AI Agent
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Call History</CardTitle>
          </div>
          <CardDescription>
            View details of all voice calls made through your AI voice agents
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <CallHistoryPanel />
        </CardContent>
      </Card>
    </div>
  );
}
