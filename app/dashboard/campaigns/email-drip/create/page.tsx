'use client';

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

interface EmailSequence {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  textContent: string;
  delayDays: number;
  delayHours: number;
  sendTime: string;
  skipIfEngaged: boolean;
}

export default function CreateDripCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState('details');

  // Campaign details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('MANUAL');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [enableAbTesting, setEnableAbTesting] = useState(false);
  const [tags, setTags] = useState('');

  // Email sequences
  const [sequences, setSequences] = useState<EmailSequence[]>([
    {
      id: '1',
      name: 'Email 1',
      subject: '',
      previewText: '',
      htmlContent: '',
      textContent: '',
      delayDays: 0,
      delayHours: 0,
      sendTime: '',
      skipIfEngaged: false,
    },
  ]);

  const addSequence = () => {
    const newSequence: EmailSequence = {
      id: Date.now().toString(),
      name: `Email ${sequences.length + 1}`,
      subject: '',
      previewText: '',
      htmlContent: '',
      textContent: '',
      delayDays: sequences.length > 0 ? 1 : 0,
      delayHours: 0,
      sendTime: '',
      skipIfEngaged: false,
    };
    setSequences([...sequences, newSequence]);
  };

  const removeSequence = (id: string) => {
    if (sequences.length === 1) {
      toast.error('Campaign must have at least one email');
      return;
    }
    setSequences(sequences.filter(seq => seq.id !== id));
  };

  const updateSequence = (id: string, updates: Partial<EmailSequence>) => {
    setSequences(sequences.map(seq =>
      seq.id === id ? { ...seq, ...updates } : seq
    ));
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast.error('Please enter a campaign name');
      return false;
    }

    if (!fromEmail.trim()) {
      toast.error('Please enter a from email address');
      return false;
    }

    // Validate sequences
    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      if (!seq.subject.trim()) {
        toast.error(`Email ${i + 1}: Subject is required`);
        return false;
      }
      if (!seq.htmlContent.trim()) {
        toast.error(`Email ${i + 1}: Email content is required`);
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
      const campaignResponse = await fetch('/api/campaigns/drip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          status,
          triggerType,
          fromName,
          fromEmail,
          replyTo,
          enableAbTesting,
          tags,
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
        await fetch(`/api/campaigns/drip/${campaign.id}/sequences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sequenceOrder: i + 1,
            name: seq.name,
            subject: seq.subject,
            previewText: seq.previewText,
            htmlContent: seq.htmlContent,
            textContent: seq.textContent,
            delayDays: seq.delayDays,
            delayHours: seq.delayHours,
            sendTime: seq.sendTime,
            skipIfEngaged: seq.skipIfEngaged,
          }),
        });
      }

      toast.success(
        status === 'ACTIVE'
          ? 'Campaign created and activated!'
          : 'Campaign saved as draft'
      );
      router.push(`/dashboard/campaigns/email-drip/${campaign.id}`);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
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
            <h1 className="text-3xl font-bold text-gray-900">Create Email Drip Campaign</h1>
            <p className="text-gray-500 mt-1">Build an automated email sequence for your leads</p>
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
          <TabsTrigger value="sequences">Email Sequences</TabsTrigger>
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
                    placeholder="e.g., Welcome Series"
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
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email *</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="john@company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replyTo">Reply-To Email</Label>
                    <Input
                      id="replyTo"
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="support@company.com"
                    />
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

              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">A/B Testing</h3>
                    <p className="text-sm text-gray-500">Test different subject lines and content</p>
                  </div>
                  <Switch
                    checked={enableAbTesting}
                    onCheckedChange={setEnableAbTesting}
                  />
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
                          Email {index + 1}
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
                      <Label>Email Name</Label>
                      <Input
                        value={sequence.name}
                        onChange={(e) => updateSequence(sequence.id, { name: e.target.value })}
                        placeholder="e.g., Welcome Email"
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
                    <Label>Subject Line *</Label>
                    <Input
                      value={sequence.subject}
                      onChange={(e) => updateSequence(sequence.id, { subject: e.target.value })}
                      placeholder="Enter email subject..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preview Text</Label>
                    <Input
                      value={sequence.previewText}
                      onChange={(e) => updateSequence(sequence.id, { previewText: e.target.value })}
                      placeholder="This appears after the subject in inbox..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Content (HTML) *</Label>
                    <Textarea
                      value={sequence.htmlContent}
                      onChange={(e) => updateSequence(sequence.id, { htmlContent: e.target.value })}
                      placeholder="Enter HTML content for the email..."
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Text Content (Fallback)</Label>
                    <Textarea
                      value={sequence.textContent}
                      onChange={(e) => updateSequence(sequence.id, { textContent: e.target.value })}
                      placeholder="Plain text version of the email..."
                      rows={4}
                    />
                  </div>

                  {index > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <Label className="text-sm font-medium">Skip if Lead Engaged</Label>
                        <p className="text-xs text-gray-500">Don't send if lead opened/clicked previous email</p>
                      </div>
                      <Switch
                        checked={sequence.skipIfEngaged}
                        onCheckedChange={(checked) => updateSequence(sequence.id, { skipIfEngaged: checked })}
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
              Add Another Email
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
