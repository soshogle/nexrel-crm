
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Wand2, Loader2, AlertCircle, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  template?: any;
}

export function CreateWorkflowDialog({ open, onOpenChange, onSuccess, template }: CreateWorkflowDialogProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [aiDescription, setAiDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  // Manual form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('');

  useEffect(() => {
    if (template) {
      setGeneratedWorkflow(template.workflow);
      setMode('ai');
    } else if (!open) {
      // Reset form when dialog closes
      setMode('ai');
      setAiDescription('');
      setGeneratedWorkflow(null);
      setName('');
      setDescription('');
      setTriggerType('');
    }
  }, [open, template]);

  const generateWorkflow = async () => {
    if (!aiDescription.trim()) {
      toast.error('Please describe what you want to automate');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiDescription }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedWorkflow(data.workflow);
        toast.success('Workflow generated successfully!');
      } else {
        throw new Error('Failed to generate workflow');
      }
    } catch (error) {
      console.error('Error generating workflow:', error);
      toast.error('Failed to generate workflow. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const createWorkflow = async () => {
    setCreating(true);
    try {
      const workflowData = generatedWorkflow || {
        name,
        description,
        triggerType,
        status: 'DRAFT',
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (response.ok) {
        toast.success('Workflow created successfully!');
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error('Failed to create workflow');
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  const triggerTypes = [
    { value: 'MESSAGE_RECEIVED', label: 'New Message Received' },
    { value: 'MESSAGE_WITH_KEYWORDS', label: 'Message with Keywords' },
    { value: 'AFTER_HOURS_MESSAGE', label: 'After Hours Message' },
    { value: 'CONVERSATION_STARTED', label: 'Conversation Started' },
    { value: 'LEAD_CREATED', label: 'Lead Created' },
    { value: 'LEAD_STATUS_CHANGED', label: 'Lead Status Changed' },
    { value: 'LEAD_NO_RESPONSE', label: 'Lead No Response' },
    { value: 'DEAL_CREATED', label: 'Deal Created' },
    { value: 'DEAL_STAGE_CHANGED', label: 'Deal Stage Changed' },
    { value: 'DEAL_STALE', label: 'Deal Stale' },
    { value: 'DEAL_WON', label: 'Deal Won' },
    { value: 'TIME_BASED', label: 'Time Based' },
  ];

  const actionTypeLabels: Record<string, string> = {
    CREATE_LEAD_FROM_MESSAGE: 'Create Lead from Message',
    CREATE_DEAL_FROM_LEAD: 'Create Deal from Lead',
    AUTO_REPLY: 'Auto Reply',
    SEND_MESSAGE: 'Send Message',
    SEND_SMS: 'Send SMS',
    SEND_EMAIL: 'Send Email',
    UPDATE_LEAD: 'Update Lead',
    CHANGE_LEAD_STATUS: 'Change Lead Status',
    UPDATE_DEAL: 'Update Deal',
    MOVE_DEAL_STAGE: 'Move Deal Stage',
    CREATE_TASK: 'Create Task',
    SCHEDULE_FOLLOW_UP: 'Schedule Follow-Up',
    NOTIFY_USER: 'Notify User',
    ADD_TAG: 'Add Tag',
    WAIT_DELAY: 'Wait Delay',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {template ? 'Use Workflow Template' : 'Create Workflow Automation'}
          </DialogTitle>
          <DialogDescription>
            {template 
              ? 'Review and customize this template before creating your workflow'
              : 'Describe what you want to automate, and AI will build it for you'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!template && !generatedWorkflow && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={mode === 'ai' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('ai')}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI-Assisted
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('manual')}
                className="flex-1"
              >
                Manual Setup
              </Button>
            </div>
          )}

          {mode === 'ai' && !generatedWorkflow && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Wand2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      Describe Your Automation
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Tell us what you want to automate in plain English. For example:
                    </p>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 list-disc list-inside space-y-1">
                      <li>&quot;When someone texts about pricing, create a lead and send price list&quot;</li>
                      <li>&quot;If a deal hasn&apos;t moved in 7 days, send a follow-up email&quot;</li>
                      <li>&quot;Auto-reply to messages received after business hours&quot;</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-description">What do you want to automate?</Label>
                <Textarea
                  id="ai-description"
                  placeholder="When someone DMs me on Instagram asking about pricing, create a lead and send them our price list..."
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={generateWorkflow}
                disabled={generating || !aiDescription.trim()}
                className="w-full gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Workflow...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Workflow with AI
                  </>
                )}
              </Button>
            </div>
          )}

          {mode === 'manual' && !generatedWorkflow && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Pricing Inquiry Handler"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this workflow does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trigger..." />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium mb-1">Manual workflows start as drafts</p>
                    <p>You&apos;ll be able to configure actions and conditions after creation.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {generatedWorkflow && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                      Workflow Generated Successfully!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Review the workflow below and click Create to add it to your automations.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="bg-card">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{generatedWorkflow.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {generatedWorkflow.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-medium">Trigger:</span>
                      <Badge variant="secondary">
                        {triggerTypes.find(t => t.value === generatedWorkflow.triggerType)?.label || 
                         generatedWorkflow.triggerType.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {generatedWorkflow.actions && generatedWorkflow.actions.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Actions:
                        </div>
                        <div className="ml-6 space-y-2">
                          {generatedWorkflow.actions.map((action: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {index + 1}. {actionTypeLabels[action.type] || action.type}
                                </div>
                                {action.delayMinutes && action.delayMinutes > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Wait {action.delayMinutes} minutes
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {generatedWorkflow.suggestions && generatedWorkflow.suggestions.length > 0 && (
                    <div className="bg-muted rounded-lg p-3 space-y-1">
                      <div className="text-sm font-medium">💡 AI Suggestions:</div>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {generatedWorkflow.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {generatedWorkflow ? (
            <Button onClick={createWorkflow} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workflow'
              )}
            </Button>
          ) : mode === 'manual' && (
            <Button 
              onClick={createWorkflow} 
              disabled={creating || !name || !triggerType}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Draft'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
