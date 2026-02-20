'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Mail, FileText, Users, Send, Sparkles, Wand2, TrendingUp, Clock, Target, Lightbulb } from 'lucide-react';
import { PersonalizationVariables } from '@/components/workflows/personalization-variables';

interface CreateEmailCampaignDialogProps {
  open: boolean;
  onClose: () => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  previewText: string;
  htmlContent: string;
}

export function CreateEmailCampaignDialog({
  open,
  onClose,
}: CreateEmailCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientType, setRecipientType] = useState<'leads' | 'deals'>('leads');

  // AI Generation State
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGoal, setAiGoal] = useState({
    description: '',
    targetAudience: '',
    tone: 'professional',
    goal: 'engagement',
    businessContext: '',
  });
  const [subjectVariants, setSubjectVariants] = useState<string[]>([]);
  const [showSubjectVariants, setShowSubjectVariants] = useState(false);
  const emailContentRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    previewText: '',
    htmlContent: '',
    textContent: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
    scheduledFor: '',
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
      fetchLeads();
      fetchDeals();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/campaigns/email/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.filter((lead: any) => lead.email));
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
        setDeals(data.filter((deal: any) => deal.lead?.email));
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setFormData({
      ...formData,
      subject: template.subject,
      previewText: template.previewText,
      htmlContent: template.htmlContent,
    });
    setStep(2);
  };

  const handleAiGenerate = async () => {
    if (!aiGoal.description) {
      toast.error('Please describe your campaign goal');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/campaigns/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiGoal),
      });

      if (response.ok) {
        const data = await response.json();
        const campaign = data.campaign;

        // Populate form with AI-generated content
        setFormData({
          name: campaign.name,
          subject: campaign.subject,
          previewText: campaign.previewText,
          htmlContent: campaign.htmlContent,
          textContent: campaign.textContent,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          replyTo: '',
          scheduledFor: '',
        });

        setSubjectVariants(campaign.subjectVariants || []);

        toast.success(
          <div>
            <p className="font-semibold">Campaign Generated! 🎉</p>
            <p className="text-sm">Review and customize before sending</p>
          </div>
        );

        // Switch to manual mode at step 2 so user can review
        setCreationMode('manual');
        setStep(2);
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

  const handleGenerateSubjectVariants = async () => {
    if (!formData.subject) {
      toast.error('Please enter a subject line first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/ai/subject-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          count: 5,
          tone: aiGoal.tone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubjectVariants(data.variants || []);
        setShowSubjectVariants(true);
        toast.success('Generated subject line variants for A/B testing');
      } else {
        toast.error('Failed to generate variants');
      }
    } catch (error) {
      console.error('Error generating variants:', error);
      toast.error('Failed to generate variants');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeContent = async () => {
    if (!formData.htmlContent) {
      toast.error('Please enter email content first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/ai/optimize-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.htmlContent,
          contentType: 'email',
          optimizationGoals: ['clarity', 'engagement', 'call-to-action'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          ...formData,
          htmlContent: data.result.optimizedContent,
        });
        
        toast.success(
          <div>
            <p className="font-semibold">Content Optimized! ✨</p>
            <p className="text-sm">{data.result.improvements.join(', ')}</p>
          </div>
        );
      } else {
        toast.error('Failed to optimize content');
      }
    } catch (error) {
      console.error('Error optimizing content:', error);
      toast.error('Failed to optimize content');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipientToggle = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/email', {
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
      subject: '',
      previewText: '',
      htmlContent: '',
      textContent: '',
      fromName: '',
      fromEmail: '',
      replyTo: '',
      scheduledFor: '',
    });
    setAiGoal({
      description: '',
      targetAudience: '',
      tone: 'professional',
      goal: 'engagement',
      businessContext: '',
    });
    setSubjectVariants([]);
    setShowSubjectVariants(false);
    setSelectedRecipients([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create Email Campaign
            {creationMode === 'ai' && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Powered
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && creationMode === 'manual' && 'Choose a template or start from scratch'}
            {step === 1 && creationMode === 'ai' && 'Describe your campaign and let AI do the rest'}
            {step === 2 && 'Customize your email content'}
            {step === 3 && 'Select recipients and send'}
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
                    <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">AI Campaign Generator</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Describe your campaign goal in plain English and our AI will generate a complete, 
                      professional email campaign including subject lines, content, and recommendations.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span>5 Subject Line Variants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span>Audience Targeting</span>
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
                  placeholder="Example: Create a summer sale email campaign for our new product line, targeting existing customers with a 20% discount offer. Make it exciting and urgent."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific about your goal, target audience, and key message
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
                    placeholder="E.g., Existing customers, New leads"
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
                      <SelectItem value="event">Event Invitation</SelectItem>
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
                    placeholder="E.g., SaaS, E-commerce, Agency"
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
            <Button
              variant="outline"
              className="w-full h-20"
              onClick={() => setStep(2)}
            >
              <FileText className="h-5 w-5 mr-2" />
              Start from Scratch
            </Button>

            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4">
                    <Mail className="h-8 w-8 mb-2 text-primary" />
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-xs text-muted-foreground">{template.category}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Summer Sale 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) =>
                    setFormData({ ...formData, fromName: e.target.value })
                  }
                  placeholder="Your Company"
                />
              </div>
              <div>
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, fromEmail: e.target.value })
                  }
                  placeholder="hello@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="subject">Subject Line *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateSubjectVariants}
                  disabled={loading || !formData.subject}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate Variants
                </Button>
              </div>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Amazing deals just for you!"
              />
              
              {/* Subject Line Variants */}
              {showSubjectVariants && subjectVariants.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">AI-Generated Variants (A/B Testing):</p>
                  {subjectVariants.map((variant, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left text-sm p-2 rounded hover:bg-background transition-colors border border-transparent hover:border-primary"
                      onClick={() => {
                        setFormData({ ...formData, subject: variant });
                        setShowSubjectVariants(false);
                        toast.success('Subject line updated');
                      }}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="previewText">Preview Text</Label>
              <Input
                id="previewText"
                value={formData.previewText}
                onChange={(e) =>
                  setFormData({ ...formData, previewText: e.target.value })
                }
                placeholder="This appears in inbox preview"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="htmlContent">Email Content (HTML) *</Label>
                <div className="flex items-center gap-1">
                  <PersonalizationVariables textareaRef={emailContentRef} onInsert={(token) => {
                    setFormData(prev => ({ ...prev, htmlContent: prev.htmlContent + token }));
                  }} mode="button" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOptimizeContent}
                    disabled={loading || !formData.htmlContent}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Optimize with AI
                  </Button>
                </div>
              </div>
              <Textarea
                id="htmlContent"
                ref={emailContentRef}
                value={formData.htmlContent}
                onChange={(e) =>
                  setFormData({ ...formData, htmlContent: e.target.value })
                }
                rows={10}
                placeholder="<div>Hi {{firstName}}, ...</div>"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Select Recipients
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Tabs value={recipientType} onValueChange={(v) => setRecipientType(v as 'leads' | 'deals')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
                <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="leads" className="space-y-2 max-h-80 overflow-y-auto">
                {leads.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No leads with email addresses found
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
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                      </label>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="deals" className="space-y-2 max-h-80 overflow-y-auto">
                {deals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No deals with email addresses found
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
                          {deal.lead?.businessName} - {deal.lead?.email}
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
              <Button variant="outline" onClick={() => setStep(2)}>
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
