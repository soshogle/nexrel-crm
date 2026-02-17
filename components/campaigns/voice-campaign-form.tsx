'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  status: string;
}

export function VoiceCampaignForm() {
  const router = useRouter();
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voiceAgentId: '',
    minLeadScore: 75,
    maxCallsPerDay: 50,
    callWindowStart: '09:00',
    callWindowEnd: '17:00',
    retryFailedCalls: true,
    maxRetries: 2,
  });

  useEffect(() => {
    fetch('/api/voice-agents')
      .then((r) => (r.ok ? r.json() : { voiceAgents: [] }))
      .then((d) => setVoiceAgents(d.voiceAgents || []))
      .catch(() => setVoiceAgents([]));
  }, []);

  const handleCreate = async () => {
    if (!formData.name?.trim() || !formData.voiceAgentId) {
      toast.error('Please fill in name and voice agent');
      return;
    }
    try {
      setProcessing(true);
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description || undefined,
          type: 'VOICE_CALL',
          voiceAgentId: formData.voiceAgentId,
          minLeadScore: formData.minLeadScore,
          maxCallsPerDay: formData.maxCallsPerDay,
          callWindowStart: formData.callWindowStart,
          callWindowEnd: formData.callWindowEnd,
          retryFailedCalls: formData.retryFailedCalls,
          maxRetries: formData.maxRetries,
          targetAudience: { minScore: formData.minLeadScore },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      const data = await res.json();
      toast.success('Voice campaign created!');
      router.push(`/dashboard/campaigns/${data.campaign?.id || data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.push('/dashboard/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create Voice Campaign</h1>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Campaign Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Q4 High-Value Lead Outreach"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Automated calling campaign targeting leads with score 75+"
            rows={3}
          />
        </div>
        <div>
          <Label>Voice Agent *</Label>
          <Select
            value={formData.voiceAgentId}
            onValueChange={(v) => setFormData({ ...formData, voiceAgentId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a voice agent" />
            </SelectTrigger>
            <SelectContent>
              {voiceAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Lead Score</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={formData.minLeadScore}
              onChange={(e) =>
                setFormData({ ...formData, minLeadScore: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Max Calls Per Day</Label>
            <Input
              type="number"
              min={1}
              value={formData.maxCallsPerDay}
              onChange={(e) =>
                setFormData({ ...formData, maxCallsPerDay: parseInt(e.target.value) || 50 })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Call Window Start</Label>
            <Input
              type="time"
              value={formData.callWindowStart}
              onChange={(e) => setFormData({ ...formData, callWindowStart: e.target.value })}
            />
          </div>
          <div>
            <Label>Call Window End</Label>
            <Input
              type="time"
              value={formData.callWindowEnd}
              onChange={(e) => setFormData({ ...formData, callWindowEnd: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Max Retry Attempts</Label>
          <Input
            type="number"
            min={0}
            max={5}
            value={formData.maxRetries}
            onChange={(e) =>
              setFormData({ ...formData, maxRetries: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={handleCreate} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Voice Campaign'
            )}
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/campaigns')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
