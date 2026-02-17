'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface SmsSequence {
  id: string;
  name: string;
  message: string;
  delayDays: number;
  delayHours: number;
  sendTime: string;
  skipIfReplied: boolean;
}

export default function CreateSmsDripCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState('details');

  // Campaign details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('MANUAL');
  const [fromNumber, setFromNumber] = useState('');
  const [tags, setTags] = useState('');

  // SMS sequences
  const [sequences, setSequences] = useState<SmsSequence[]>([
    {
      id: '1',
      name: 'SMS 1',
      message: '',
      delayDays: 0,
      delayHours: 0,
      sendTime: '',
      skipIfReplied: false,
    },
  ]);

  const addSequence = () => {
    const newSequence: SmsSequence = {
      id: Date.now().toString(),
      name: `SMS ${sequences.length + 1}`,
      message: '',
      delayDays: sequences.length > 0 ? 1 : 0,
      delayHours: 0,
      sendTime: '',
      skipIfReplied: false,
    };
    setSequences([...sequences, newSequence]);
  };

  const removeSequence = (id: string) => {
    if (sequences.length === 1) {
      toast.error('Campaign must have at least one SMS');
      return;
    }
    setSequences(sequences.filter(seq => seq.id !== id));
  };

  const updateSequence = (id: string, updates: Partial<SmsSequence>) => {
    setSequences(sequences.map(seq =>
      seq.id === id ? { ...seq, ...updates } : seq
    ));
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast.error('Please enter a campaign name');
      return false;
    }

    // Validate sequences
    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      if (!seq.message.trim()) {
        toast.error(`SMS ${i + 1}: Message content is required`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async (status: 'DRAFT' | 'ACTIVE' = 'DRAFT') => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Create campaign
      const campaignResponse = await fetch('/api/campaigns/sms-drip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          status,
          triggerType,
          fromNumber: fromNumber.trim() || undefined,
          tags: tags.trim() || undefined,
        }),
      });

      if (!campaignResponse.ok) {
        const error = await campaignResponse.json();
        throw new Error(error.error || 'Failed to create campaign');
      }

      const { campaign } = await campaignResponse.json();

      // Create sequences
      for (let i = 0; i < sequences.length; i++) {
        const seq = sequences[i];
        await fetch(`/api/campaigns/sms-drip/${campaign.id}/sequences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sequenceOrder: i + 1,
            name: seq.name,
            message: seq.message,
            delayDays: seq.delayDays,
            delayHours: seq.delayHours,
            sendTime: seq.sendTime || undefined,
            skipIfReplied: seq.skipIfReplied,
          }),
        });
      }

      toast.success(
        status === 'ACTIVE'
          ? 'Campaign created and activated!'
          : 'Campaign saved as draft'
      );
      router.push(`/dashboard/campaigns/sms-drip/${campaign.id}`);
    } catch (error: unknown) {
      console.error('Error creating campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create SMS Drip Campaign</h1>
            <p className="text-gray-500 mt-1">Build an automated SMS sequence for your leads</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('DRAFT')}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('ACTIVE')}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create & Activate'}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="details">Campaign Details</TabsTrigger>
          <TabsTrigger value="sequences">SMS Sequences</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>
                Configure your campaign details and sender information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Welcome SMS Series"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="triggerType">Trigger Type</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger id="triggerType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="LEAD_CREATED">When Lead is Created</SelectItem>
                      <SelectItem value="LEAD_STATUS">When Lead Status Changes</SelectItem>
                      <SelectItem value="TAG_ADDED">When Tag is Added</SelectItem>
                      <SelectItem value="WEBSITE_VOICE_AI_LEAD">When Website Voice AI Captures Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this campaign..."
                  rows={3}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Sender Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fromNumber">From Number (Optional)</Label>
                    <Input
                      id="fromNumber"
                      value={fromNumber}
                      onChange={(e) => setFromNumber(e.target.value)}
                      placeholder="+1234567890"
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty to use your default Twilio number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="welcome, onboarding"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          <div className="space-y-4">
            {sequences.map((sequence, index) => (
              <Card key={sequence.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <div>
                        <CardTitle className="text-lg">
                          SMS {index + 1}
                          {index > 0 && (
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              (Sent {sequence.delayDays}d {sequence.delayHours}h after previous)
                            </span>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                    {sequences.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSequence(sequence.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMS Name</Label>
                      <Input
                        value={sequence.name}
                        onChange={(e) => updateSequence(sequence.id, { name: e.target.value })}
                        placeholder="e.g., Welcome SMS"
                      />
                    </div>

                    {index > 0 && (
                      <>
                        <div className="space-y-2">
                          <Label>Delay (Days)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={sequence.delayDays}
                            onChange={(e) => updateSequence(sequence.id, { delayDays: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Additional Delay (Hours)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={sequence.delayHours}
                            onChange={(e) => updateSequence(sequence.id, { delayHours: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Preferred Send Time (HH:MM)</Label>
                      <Input
                        type="time"
                        value={sequence.sendTime}
                        onChange={(e) => updateSequence(sequence.id, { sendTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Message Content *</Label>
                    <Textarea
                      value={sequence.message}
                      onChange={(e) => updateSequence(sequence.id, { message: e.target.value })}
                      placeholder="Enter your SMS message (160 chars = 1 segment)..."
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">
                      {sequence.message.length} characters
                      {sequence.message.length > 160 && ` • ${Math.ceil(sequence.message.length / 160)} segments`}
                    </p>
                  </div>

                  {index > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <Label className="text-sm font-medium">Skip if Lead Replied</Label>
                        <p className="text-xs text-gray-500">Don&apos;t send if lead replied to previous SMS</p>
                      </div>
                      <Switch
                        checked={sequence.skipIfReplied}
                        onCheckedChange={(checked) => updateSequence(sequence.id, { skipIfReplied: checked })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={addSequence}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another SMS
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
