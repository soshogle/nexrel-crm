'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Sparkles, Wand2, MessageSquare, Target, Clock, Lightbulb, FileText } from 'lucide-react';

interface CreateSmsCampaignDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSmsCampaignDialog({
  open,
  onClose,
}: CreateSmsCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientType, setRecipientType] = useState<'leads' | 'deals'>('leads');

  // AI Generation State
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGoal, setAiGoal] = useState({
    description: '',
    targetAudience: '',
    tone: 'friendly',
    goal: 'engagement',
    businessContext: '',
  });
  const [messageVariants, setMessageVariants] = useState<string[]>([]);
  const [showMessageVariants, setShowMessageVariants] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    message: '',
    fromNumber: '',
    scheduledFor: '',
  });

  const MAX_SMS_LENGTH = 160;
  const messageLength = formData.message.length;
  const segmentCount = Math.ceil(messageLength / MAX_SMS_LENGTH) || 1;

  useEffect(() => {
    if (open) {
      fetchLeads();
      fetchDeals();
    }
  }, [open]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.filter((lead: any) => lead.phone));
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await fetch('/api/deals');
      if (response.ok) {
        const data = await response.json();
        setDeals(data.filter((deal: any) => deal.lead?.phone));
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const handleRecipientToggle = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleAiGenerate = async () => {
    if (!aiGoal.description) {
      toast.error('Please describe your campaign goal');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/campaigns/ai/generate-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...aiGoal,
          constraints: {
            maxLength: MAX_SMS_LENGTH,
            includeEmojis: true,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const campaign = data.campaign;

        // Populate form with AI-generated content
        setFormData({
          name: campaign.name,
          message: campaign.message,
          fromNumber: '',
          scheduledFor: '',
        });

        setMessageVariants(campaign.messageVariants || []);

        toast.success(
          <div>
            <p className="font-semibold">Campaign Generated! 🎉</p>
            <p className="text-sm">Review and customize before sending</p>
          </div>
        );

        // Switch to manual mode at step 1 so user can review
        setCreationMode('manual');
        setStep(1);
      } else {
        toast.error('Failed to generate campaign');
      }
    } catch (error) {
      console.error('Error generating campaign:', error);
      toast.error('Failed to generate campaign');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleOptimizeMessage = async () => {
    if (!formData.message) {
      toast.error('Please enter a message first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/ai/optimize-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.message,
          contentType: 'sms',
          optimizationGoals: ['clarity', 'brevity', 'call-to-action'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          ...formData,
          message: data.result.optimizedContent,
        });
        
        toast.success(
          <div>
            <p className="font-semibold">Message Optimized! ✨</p>
            <p className="text-sm">{data.result.improvements.join(', ')}</p>
          </div>
        );
      } else {
        toast.error('Failed to optimize message');
      }
    } catch (error) {
      console.error('Error optimizing message:', error);
      toast.error('Failed to optimize message');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          recipientIds: selectedRecipients,
          recipientType,
        }),
      });

      if (response.ok) {
        toast.success('Campaign created successfully!');
        handleClose();
      } else {
        toast.error('Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCreationMode('manual');
    setFormData({
      name: '',
      message: '',
      fromNumber: '',
      scheduledFor: '',
    });
    setAiGoal({
      description: '',
      targetAudience: '',
      tone: 'friendly',
      goal: 'engagement',
      businessContext: '',
    });
    setMessageVariants([]);
    setShowMessageVariants(false);
    setSelectedRecipients([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create SMS Campaign
            {creationMode === 'ai' && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Powered
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && creationMode === 'manual' && 'Write your SMS message'}
            {step === 1 && creationMode === 'ai' && 'Describe your campaign and let AI do the rest'}
            {step === 2 && 'Select recipients and send'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selection */}
        {step === 1 && (
          <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as 'manual' | 'ai')} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">
                <FileText className="h-4 w-4 mr-2" />
                Manual Creation
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assistant
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* AI Mode */}
        {step === 1 && creationMode === 'ai' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">AI SMS Generator</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Describe your campaign goal and our AI will create a concise, compelling SMS 
                      message optimized for maximum engagement.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                        <span>Multiple Variants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span>Character Optimization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span>Best Send Time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-purple-600" />
                        <span>Personalization Tips</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="ai-description">Campaign Goal *</Label>
                <Textarea
                  id="ai-description"
                  value={aiGoal.description}
                  onChange={(e) =>
                    setAiGoal({ ...aiGoal, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Example: Send a flash sale SMS to our customers about 50% off clearance items. Include urgency and a short link. Keep it under 160 characters."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific about your message, offer, and any constraints
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ai-audience">Target Audience</Label>
                  <Input
                    id="ai-audience"
                    value={aiGoal.targetAudience}
                    onChange={(e) =>
                      setAiGoal({ ...aiGoal, targetAudience: e.target.value })
                    }
                    placeholder="E.g., VIP customers, New signups"
                  />
                </div>

                <div>
                  <Label htmlFor="ai-tone">Tone</Label>
                  <Select
                    value={aiGoal.tone}
                    onValueChange={(value) => setAiGoal({ ...aiGoal, tone: value })}
                  >
                    <SelectTrigger id="ai-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ai-goal">Campaign Type</Label>
                  <Select
                    value={aiGoal.goal}
                    onValueChange={(value) => setAiGoal({ ...aiGoal, goal: value })}
                  >
                    <SelectTrigger id="ai-goal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales/Promotion</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="nurture">Lead Nurture</SelectItem>
                      <SelectItem value="event">Event Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ai-context">Business Context (Optional)</Label>
                  <Input
                    id="ai-context"
                    value={aiGoal.businessContext}
                    onChange={(e) =>
                      setAiGoal({ ...aiGoal, businessContext: e.target.value })
                    }
                    placeholder="E.g., Retail, Restaurant, Services"
                  />
                </div>
              </div>

              <Button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiGoal.description}
                className="w-full"
                size="lg"
              >
                {aiGenerating ? (
                  <>
                    <Wand2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Campaign...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Campaign with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Manual Mode - Step 1 */}
        {step === 1 && creationMode === 'manual' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Summer Flash Sale"
              />
            </div>

            <div>
              <Label htmlFor="fromNumber">From Number (Optional)</Label>
              <Input
                id="fromNumber"
                value={formData.fromNumber}
                onChange={(e) =>
                  setFormData({ ...formData, fromNumber: e.target.value })
                }
                placeholder="+1234567890"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to use default Twilio number
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="message">SMS Message *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOptimizeMessage}
                  disabled={loading || !formData.message}
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Optimize with AI
                </Button>
              </div>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={6}
                placeholder="Hi {{name}}, check out our special offer..."
                className="resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">
                  Use {`{{name}}`} for personalization
                </p>
                <div className="text-xs text-muted-foreground">
                  <span className={messageLength > MAX_SMS_LENGTH ? 'text-orange-600 font-semibold' : ''}>
                    {messageLength} characters
                  </span>
                  {' · '}
                  <span>
                    {segmentCount} {segmentCount === 1 ? 'message' : 'messages'}
                  </span>
                </div>
              </div>
              
              {/* Message Variants */}
              {showMessageVariants && messageVariants.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">AI-Generated Variants (A/B Testing):</p>
                  {messageVariants.map((variant, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left text-sm p-2 rounded hover:bg-background transition-colors border border-transparent hover:border-primary"
                      onClick={() => {
                        setFormData({ ...formData, message: variant });
                        setShowMessageVariants(false);
                        toast.success('Message updated');
                      }}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Next: Select Recipients
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Tabs value={recipientType} onValueChange={(v) => setRecipientType(v as 'leads' | 'deals')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
                <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="leads" className="space-y-2 max-h-80 overflow-y-auto">
                {leads.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No leads with phone numbers found
                  </p>
                ) : (
                  leads.map((lead) => (
                    <div key={lead.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <Checkbox
                        id={lead.id}
                        checked={selectedRecipients.includes(lead.id)}
                        onCheckedChange={() => handleRecipientToggle(lead.id)}
                      />
                      <label htmlFor={lead.id} className="flex-1 cursor-pointer">
                        <p className="font-medium">{lead.businessName}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone}</p>
                      </label>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="deals" className="space-y-2 max-h-80 overflow-y-auto">
                {deals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No deals with phone numbers found
                  </p>
                ) : (
                  deals.map((deal) => (
                    <div key={deal.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <Checkbox
                        id={deal.id}
                        checked={selectedRecipients.includes(deal.id)}
                        onCheckedChange={() => handleRecipientToggle(deal.id)}
                      />
                      <label htmlFor={deal.id} className="flex-1 cursor-pointer">
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {deal.lead?.businessName} - {deal.lead?.phone}
                        </p>
                      </label>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>

            <div className="bg-muted p-3 rounded">
              <p className="text-sm">
                <strong>{selectedRecipients.length}</strong> recipients selected
                {' · '}
                Est. cost: <strong>${(selectedRecipients.length * segmentCount * 0.0075).toFixed(2)}</strong>
              </p>
            </div>

            <div>
              <Label htmlFor="scheduledFor">Schedule for Later (Optional)</Label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledFor: e.target.value })
                }
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
