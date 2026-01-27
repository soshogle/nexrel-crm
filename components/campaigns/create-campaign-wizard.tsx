'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Mail, 
  MessageSquare, 
  Phone,
  Users, 
  Calendar, 
  Send, 
  Loader2, 
  Eye,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface CreateCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated?: () => void;
}

export default function CreateCampaignWizard({
  open,
  onOpenChange,
  onCampaignCreated,
}: CreateCampaignWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form data
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    type: 'EMAIL' as 'EMAIL' | 'SMS' | 'VOICE_CALL' | 'MULTI_CHANNEL',
    goal: '',
    tone: 'professional' as 'professional' | 'casual' | 'friendly' | 'urgent',
    emailSubject: '',
    emailBody: '',
    smsTemplate: '',
    voiceAgentId: '',
    callScript: '',
    targetAudience: {
      status: '',
      tags: [] as string[],
      type: '',
    },
    scheduledFor: '',
    frequency: 'ONE_TIME' as 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
  });

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);

  // Voice agents
  const [voiceAgents, setVoiceAgents] = useState<any[]>([]);

  // Fetch voice agents on mount
  useEffect(() => {
    const fetchVoiceAgents = async () => {
      try {
        const response = await fetch('/api/voice-agents');
        if (response.ok) {
          const data = await response.json();
          setVoiceAgents(data.agents || []);
        }
      } catch (error) {
        console.error('Error fetching voice agents:', error);
      }
    };

    if (open) {
      fetchVoiceAgents();
    }
  }, [open]);

  const handleGenerateContent = async () => {
    if (!campaignData.goal) {
      toast.error('Please describe your campaign goal first');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType: campaignData.type,
          goal: campaignData.goal,
          targetAudience: campaignData.targetAudience,
          tone: campaignData.tone,
          includePersonalization: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      setAiSuggestions(data);

      // Auto-fill content
      if (data.generated.email) {
        setCampaignData((prev) => ({
          ...prev,
          emailSubject: data.generated.emailSubjects[0],
          emailBody: data.generated.email.body,
        }));
      }

      if (data.generated.sms) {
        setCampaignData((prev) => ({
          ...prev,
          smsTemplate: data.generated.sms.smsText,
        }));
      }

      if (data.generated.voice) {
        setCampaignData((prev) => ({
          ...prev,
          callScript: data.generated.voice.body,
        }));
      }

      toast.success('AI content generated successfully!');
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate AI content');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          aiGenerated: !!aiSuggestions,
          aiPrompt: campaignData.goal,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const data = await response.json();
      toast.success('Campaign created successfully!');
      
      if (onCampaignCreated) {
        onCampaignCreated();
      }
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCampaignData({
      name: '',
      description: '',
      type: 'EMAIL',
      goal: '',
      tone: 'professional',
      emailSubject: '',
      emailBody: '',
      smsTemplate: '',
      voiceAgentId: '',
      callScript: '',
      targetAudience: { status: '', tags: [], type: '' },
      scheduledFor: '',
      frequency: 'ONE_TIME',
    });
    setAiSuggestions(null);
  };

  const nextStep = () => {
    if (step === 1 && !campaignData.name) {
      toast.error('Please enter a campaign name');
      return;
    }
    if (step === 2 && !campaignData.goal) {
      toast.error('Please describe your campaign goal');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 gradient-text text-2xl">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Create AI-Powered Campaign
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4: Create and launch your marketing campaign with AI assistance
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              className={`flex-1 h-2 rounded-full ${
                num <= step ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Holiday Sale Announcement"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this campaign..."
                rows={3}
                value={campaignData.description}
                onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="type">Campaign Type *</Label>
              <Select
                value={campaignData.type}
                onValueChange={(value: any) => setCampaignData({ ...campaignData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Campaign
                    </div>
                  </SelectItem>
                  <SelectItem value="SMS">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS Campaign
                    </div>
                  </SelectItem>
                  <SelectItem value="VOICE_CALL">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Voice Call Campaign
                    </div>
                  </SelectItem>
                  <SelectItem value="MULTI_CHANNEL">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Multi-Channel (Email + SMS + Voice)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={nextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: AI Content Generation */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-200 mb-2">AI Content Generator</h4>
                  <p className="text-sm text-gray-300 mb-3">
                    Describe your campaign goal and let AI create compelling content for you
                  </p>
                </div>
              </div>
            </Card>

            <div>
              <Label htmlFor="goal">Campaign Goal *</Label>
              <Textarea
                id="goal"
                placeholder="e.g., Promote our holiday sale to restaurant owners with 20% off discount"
                rows={3}
                value={campaignData.goal}
                onChange={(e) => setCampaignData({ ...campaignData, goal: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={campaignData.tone}
                onValueChange={(value: any) => setCampaignData({ ...campaignData, tone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateContent}
              disabled={!campaignData.goal || aiGenerating}
              className="w-full gradient-button"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Content
                </>
              )}
            </Button>

            {aiSuggestions && (
              <Card className="p-4 bg-green-900/10 border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="font-semibold text-green-200">Content Generated!</span>
                </div>
                <p className="text-sm text-gray-300">
                  AI has generated your campaign content. Review and customize it in the next step.
                </p>
              </Card>
            )}

            <div className="flex justify-between gap-2">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep} disabled={!campaignData.goal}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Customize Content */}
        {step === 3 && (
          <div className="space-y-4">
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="edit">Edit Content</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-4">
                {(campaignData.type === 'EMAIL' || campaignData.type === 'MULTI_CHANNEL') && (
                  <Card className="p-6 bg-white text-black">
                    <h3 className="font-bold text-lg mb-2">{campaignData.emailSubject}</h3>
                    <div className="whitespace-pre-wrap">{campaignData.emailBody}</div>
                  </Card>
                )}

                {(campaignData.type === 'SMS' || campaignData.type === 'MULTI_CHANNEL') && (
                  <Card className="p-4 bg-gray-800 border-gray-700">
                    <Label className="text-sm text-gray-400 mb-2 block">SMS Preview</Label>
                    <div className="bg-blue-600/20 p-3 rounded-lg border border-blue-500/30">
                      <p className="text-sm">{campaignData.smsTemplate}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Characters: {campaignData.smsTemplate.length}/160
                      </p>
                    </div>
                  </Card>
                )}

                {(campaignData.type === 'VOICE_CALL' || campaignData.type === 'MULTI_CHANNEL') && (
                  <Card className="p-4 bg-gray-800 border-gray-700">
                    <Label className="text-sm text-gray-400 mb-2 block">
                      <Phone className="inline-block h-4 w-4 mr-2" />
                      Voice Call Script Preview
                    </Label>
                    <div className="bg-green-600/20 p-4 rounded-lg border border-green-500/30">
                      <div className="whitespace-pre-wrap text-sm">{campaignData.callScript}</div>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="edit" className="space-y-4">
                {(campaignData.type === 'EMAIL' || campaignData.type === 'MULTI_CHANNEL') && (
                  <>
                    <div>
                      <Label htmlFor="emailSubject">Email Subject *</Label>
                      <Input
                        id="emailSubject"
                        value={campaignData.emailSubject}
                        onChange={(e) =>
                          setCampaignData({ ...campaignData, emailSubject: e.target.value })
                        }
                      />
                      {aiSuggestions?.generated?.emailSubjects && (
                        <div className="mt-2">
                          <Label className="text-xs text-gray-400">AI Suggestions:</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {aiSuggestions.generated.emailSubjects.map((subject: string, index: number) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="cursor-pointer hover:bg-purple-900/20"
                                onClick={() =>
                                  setCampaignData({ ...campaignData, emailSubject: subject })
                                }
                              >
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="emailBody">Email Body *</Label>
                      <Textarea
                        id="emailBody"
                        rows={10}
                        value={campaignData.emailBody}
                        onChange={(e) =>
                          setCampaignData({ ...campaignData, emailBody: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                {(campaignData.type === 'SMS' || campaignData.type === 'MULTI_CHANNEL') && (
                  <div>
                    <Label htmlFor="smsTemplate">SMS Message *</Label>
                    <Textarea
                      id="smsTemplate"
                      rows={4}
                      maxLength={160}
                      value={campaignData.smsTemplate}
                      onChange={(e) =>
                        setCampaignData({ ...campaignData, smsTemplate: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {campaignData.smsTemplate.length}/160 characters
                    </p>
                  </div>
                )}

                {(campaignData.type === 'VOICE_CALL' || campaignData.type === 'MULTI_CHANNEL') && (
                  <>
                    <div>
                      <Label htmlFor="voiceAgentId">Voice Agent *</Label>
                      <Select
                        value={campaignData.voiceAgentId}
                        onValueChange={(value) =>
                          setCampaignData({ ...campaignData, voiceAgentId: value })
                        }
                      >
                        <SelectTrigger id="voiceAgentId">
                          <SelectValue placeholder="Select a voice agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {voiceAgents.length > 0 ? (
                            voiceAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No voice agents available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="callScript">Call Script *</Label>
                      <Textarea
                        id="callScript"
                        rows={10}
                        value={campaignData.callScript}
                        onChange={(e) =>
                          setCampaignData({ ...campaignData, callScript: e.target.value })
                        }
                        placeholder="Enter the voice call script..."
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        This script will guide the voice agent's conversation flow
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-between gap-2">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Audience & Schedule */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label>Target Audience</Label>
              <Card className="p-4 mt-2">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="audience-status" className="text-sm">Lead Status</Label>
                    <Select
                      value={campaignData.targetAudience.status}
                      onValueChange={(value) =>
                        setCampaignData({
                          ...campaignData,
                          targetAudience: { ...campaignData.targetAudience, status: value },
                        })
                      }
                    >
                      <SelectTrigger id="audience-status">
                        <SelectValue placeholder="All leads" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All leads</SelectItem>
                        <SelectItem value="NEW">New Leads</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="QUALIFIED">Qualified</SelectItem>
                        <SelectItem value="NEGOTIATION">In Negotiation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contact-type" className="text-sm">Contact Type</Label>
                    <Select
                      value={campaignData.targetAudience.type}
                      onValueChange={(value) =>
                        setCampaignData({
                          ...campaignData,
                          targetAudience: { ...campaignData.targetAudience, type: value },
                        })
                      }
                    >
                      <SelectTrigger id="contact-type">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="CUSTOMER">Customers</SelectItem>
                        <SelectItem value="PARTNER">Partners</SelectItem>
                        <SelectItem value="PROSPECT">Prospects</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <Label htmlFor="schedule">Schedule</Label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={campaignData.scheduledFor}
                    onChange={(e) => setCampaignData({ ...campaignData, scheduledFor: e.target.value })}
                  />
                </div>
                <Select
                  value={campaignData.frequency}
                  onValueChange={(value: any) => setCampaignData({ ...campaignData, frequency: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_TIME">One-time</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Leave blank to save as draft. Schedule for later or send immediately after creation.
              </p>
            </div>

            {aiSuggestions?.recommendations && (
              <Card className="p-4 bg-blue-900/10 border-blue-500/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-200 mb-2">AI Recommendations</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {aiSuggestions.recommendations.sendTime && (
                        <li>• Best send time: {new Date(aiSuggestions.recommendations.sendTime.recommendedTime).toLocaleString()}</li>
                      )}
                      {aiSuggestions.recommendations.performance && (
                        <>
                          <li>• Expected open rate: {(aiSuggestions.recommendations.performance.expectedOpenRate * 100).toFixed(1)}%</li>
                          <li>• Expected click rate: {(aiSuggestions.recommendations.performance.expectedClickRate * 100).toFixed(1)}%</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex justify-between gap-2">
              <Button onClick={prevStep} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleCreateCampaign} disabled={loading} className="gradient-button">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
