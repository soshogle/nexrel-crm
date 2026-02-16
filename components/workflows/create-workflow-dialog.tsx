
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
import { Sparkles, Wand2, Loader2, AlertCircle, CheckCircle2, Zap, ArrowRight, Globe, DollarSign, Users, ShoppingCart, TrendingUp, Eye, Plus, X, Clock, MessageSquare, MessageCircle, Briefcase, UserPlus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

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
  const [hasWebsites, setHasWebsites] = useState(false);
  const [websites, setWebsites] = useState<any[]>([]);
  const [triggerConfig, setTriggerConfig] = useState<any>({});
  const [conditionalLogic, setConditionalLogic] = useState<Array<{ field: string; operator: string; value: any; logic?: 'AND' | 'OR' }>>([]);

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
      setTriggerConfig({});
      setConditionalLogic([]);
    }
  }, [open, template]);

  // Fetch user websites on mount
  useEffect(() => {
    if (open) {
      fetchWebsites();
    }
  }, [open]);

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/websites');
      if (response.ok) {
        const data = await response.json();
        setWebsites(data.websites || []);
        setHasWebsites((data.websites || []).length > 0);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    }
  };

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
      // Build trigger config with conditional logic
      let finalTriggerConfig = { ...triggerConfig };
      if (conditionalLogic.length > 0) {
        finalTriggerConfig.conditions = conditionalLogic;
      }

      const workflowData = generatedWorkflow || {
        name,
        description,
        triggerType,
        triggerConfig: Object.keys(finalTriggerConfig).length > 0 ? finalTriggerConfig : undefined,
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

  // Smart amount threshold presets (in cents)
  const amountPresets = [
    { label: '$25', value: 2500 },
    { label: '$50', value: 5000 },
    { label: '$100', value: 10000 },
    { label: '$250', value: 25000 },
    { label: '$500', value: 50000 },
    { label: '$1,000', value: 100000 },
    { label: '$2,500', value: 250000 },
    { label: '$5,000', value: 500000 },
    { label: 'Custom', value: 'custom' },
  ];

  const baseTriggerTypes = [
    { value: 'MESSAGE_RECEIVED', label: 'New Message Received', icon: MessageSquare, category: 'messaging' },
    { value: 'MESSAGE_WITH_KEYWORDS', label: 'Message with Keywords', icon: MessageSquare, category: 'messaging' },
    { value: 'AFTER_HOURS_MESSAGE', label: 'After Hours Message', icon: Clock, category: 'messaging' },
    { value: 'CONVERSATION_STARTED', label: 'Conversation Started', icon: MessageSquare, category: 'messaging' },
    { value: 'LEAD_CREATED', label: 'Lead Created', icon: UserPlus, category: 'crm' },
    { value: 'LEAD_STATUS_CHANGED', label: 'Lead Status Changed', icon: Users, category: 'crm' },
    { value: 'LEAD_NO_RESPONSE', label: 'Lead No Response', icon: AlertCircle, category: 'crm' },
    { value: 'DEAL_CREATED', label: 'Deal Created', icon: Briefcase, category: 'crm' },
    { value: 'DEAL_STAGE_CHANGED', label: 'Deal Stage Changed', icon: Briefcase, category: 'crm' },
    { value: 'DEAL_STALE', label: 'Deal Stale', icon: AlertCircle, category: 'crm' },
    { value: 'DEAL_WON', label: 'Deal Won', icon: CheckCircle2, category: 'crm' },
    { value: 'TIME_BASED', label: 'Time Based', icon: Clock, category: 'system' },
  ];

  const websiteTriggerTypes = [
    // Lead & Conversion Triggers (for contacts, leads, pipeline)
    { value: 'WEBSITE_VISITOR', label: 'Website Visitor Arrives', icon: Globe, category: 'visitor' },
    { value: 'WEBSITE_FORM_SUBMITTED', label: 'Form Submitted', icon: UserPlus, category: 'lead', requiresConfig: true },
    { value: 'WEBSITE_VOICE_AI_LEAD', label: 'Website Voice AI Lead', icon: MessageCircle, category: 'lead' },
    { value: 'WEBSITE_BOOKING_CREATED', label: 'Booking Created', icon: Calendar, category: 'booking', requiresConfig: true },
    { value: 'WEBSITE_CTA_CLICKED', label: 'CTA Button Clicked', icon: Zap, category: 'visitor', requiresConfig: true },
    { value: 'WEBSITE_PAGE_VIEWED', label: 'Specific Page Viewed', icon: Eye, category: 'visitor', requiresConfig: true },
    // Payment & Customer Triggers
    { value: 'WEBSITE_PAYMENT_RECEIVED', label: 'Payment Received', icon: DollarSign, category: 'payment', requiresConfig: true },
    { value: 'WEBSITE_PAYMENT_AMOUNT_THRESHOLD', label: 'Payment Amount Threshold', icon: DollarSign, category: 'payment', requiresConfig: true },
    { value: 'WEBSITE_CUSTOMER_TIER_CHANGED', label: 'Customer Tier Changed', icon: Users, category: 'customer', requiresConfig: true },
    { value: 'WEBSITE_REPEAT_CUSTOMER', label: 'Repeat Customer', icon: Users, category: 'customer' },
    { value: 'WEBSITE_FIRST_TIME_CUSTOMER', label: 'First Time Customer', icon: UserPlus, category: 'customer' },
    { value: 'WEBSITE_PRODUCT_PURCHASED', label: 'Product Purchased', icon: ShoppingCart, category: 'product', requiresConfig: true },
    { value: 'WEBSITE_CART_VALUE_THRESHOLD', label: 'Cart Value Threshold', icon: ShoppingCart, category: 'product', requiresConfig: true },
    
    // Visitor Behavior Triggers
    { value: 'WEBSITE_VISITOR_PAGE_VIEWED', label: 'Page Viewed', icon: Eye, category: 'visitor', requiresConfig: true },
    { value: 'WEBSITE_VISITOR_TIME_ON_SITE', label: 'Time on Site', icon: Clock, category: 'visitor', requiresConfig: true },
    { value: 'WEBSITE_VISITOR_PAGES_VIEWED', label: 'Pages Viewed', icon: Eye, category: 'visitor', requiresConfig: true },
    { value: 'WEBSITE_VISITOR_CTA_CLICKED', label: 'CTA Clicked', icon: Zap, category: 'visitor', requiresConfig: true },
    { value: 'WEBSITE_VISITOR_RETURNING', label: 'Returning Visitor', icon: Users, category: 'visitor' },
    { value: 'WEBSITE_VISITOR_ABANDONED_CART', label: 'Cart Abandoned', icon: ShoppingCart, category: 'visitor' },
    
    // Analytics & Stats Triggers
    { value: 'WEBSITE_REVENUE_MILESTONE', label: 'Revenue Milestone', icon: TrendingUp, category: 'analytics', requiresConfig: true },
    { value: 'WEBSITE_ORDER_COUNT_MILESTONE', label: 'Order Count Milestone', icon: ShoppingCart, category: 'analytics', requiresConfig: true },
    { value: 'WEBSITE_DAILY_REVENUE_THRESHOLD', label: 'Daily Revenue Threshold', icon: TrendingUp, category: 'analytics', requiresConfig: true },
    
    // Existing Website Triggers
    { value: 'WEBSITE_ORDER_CREATED', label: 'Order Created', icon: ShoppingCart, category: 'order' },
    { value: 'WEBSITE_PRODUCT_LOW_STOCK', label: 'Product Low Stock', icon: AlertCircle, category: 'inventory' },
    { value: 'WEBSITE_PRODUCT_OUT_OF_STOCK', label: 'Product Out of Stock', icon: AlertCircle, category: 'inventory' },
    { value: 'WEBSITE_PRODUCT_BACK_IN_STOCK', label: 'Product Back in Stock', icon: CheckCircle2, category: 'inventory' },
  ];

  const triggerTypes = hasWebsites 
    ? [...baseTriggerTypes, ...websiteTriggerTypes]
    : baseTriggerTypes;

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
                <Select value={triggerType} onValueChange={(value) => {
                  setTriggerType(value);
                  setTriggerConfig({});
                  setConditionalLogic([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trigger..." />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((type) => {
                      const Icon = type.icon || Zap;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                            {type.category === 'payment' || type.category === 'visitor' || type.category === 'analytics' ? (
                              <Badge variant="outline" className="ml-2 text-xs">Website</Badge>
                            ) : null}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {!hasWebsites && websiteTriggerTypes.some(t => t.value === triggerType) && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Create a website first to use this trigger
                  </p>
                )}
              </div>

              {/* Trigger Configuration */}
              {triggerType && triggerTypes.find(t => t.value === triggerType)?.requiresConfig && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-semibold">Trigger Configuration</Label>
                  
                  {/* Website Selection */}
                  {hasWebsites && (
                    <div className="space-y-2">
                      <Label htmlFor="websiteId" className="text-xs">Website</Label>
                      <Select 
                        value={triggerConfig.websiteId || ''} 
                        onValueChange={(value) => setTriggerConfig({ ...triggerConfig, websiteId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select website..." />
                        </SelectTrigger>
                        <SelectContent>
                          {websites.map((website) => (
                            <SelectItem key={website.id} value={website.id}>
                              {website.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Amount Threshold Configuration */}
                  {(triggerType === 'WEBSITE_PAYMENT_AMOUNT_THRESHOLD' || 
                    triggerType === 'WEBSITE_CART_VALUE_THRESHOLD' ||
                    triggerType === 'WEBSITE_DAILY_REVENUE_THRESHOLD') && (
                    <div className="space-y-2">
                      <Label className="text-xs">Amount Threshold</Label>
                      <Select 
                        value={triggerConfig.amountPreset || ''} 
                        onValueChange={(value) => {
                          if (value === 'custom') {
                            setTriggerConfig({ ...triggerConfig, amountPreset: 'custom', customAmount: triggerConfig.customAmount || 0 });
                          } else {
                            setTriggerConfig({ ...triggerConfig, amountPreset: value, amount: parseInt(value) });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select amount..." />
                        </SelectTrigger>
                        <SelectContent>
                          {amountPresets.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value === 'custom' ? 'custom' : preset.value.toString()}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {triggerConfig.amountPreset === 'custom' && (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter custom amount"
                            value={triggerConfig.customAmount || ''}
                            onChange={(e) => setTriggerConfig({ 
                              ...triggerConfig, 
                              customAmount: parseInt(e.target.value) || 0,
                              amount: parseInt(e.target.value) || 0 
                            })}
                          />
                          <Select 
                            value={triggerConfig.operator || 'greater_than'} 
                            onValueChange={(value) => setTriggerConfig({ ...triggerConfig, operator: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="greater_than">Greater than</SelectItem>
                              <SelectItem value="less_than">Less than</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Page Path Configuration */}
                  {triggerType === 'WEBSITE_VISITOR_PAGE_VIEWED' && (
                    <div className="space-y-2">
                      <Label htmlFor="pagePath" className="text-xs">Page Path (optional)</Label>
                      <Input
                        id="pagePath"
                        placeholder="/products, /about, etc."
                        value={triggerConfig.pagePath || ''}
                        onChange={(e) => setTriggerConfig({ ...triggerConfig, pagePath: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Time on Site Configuration */}
                  {triggerType === 'WEBSITE_VISITOR_TIME_ON_SITE' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Minimum Time (seconds)</Label>
                      <Input
                        type="number"
                        placeholder="60"
                        value={triggerConfig.minTime || ''}
                        onChange={(e) => setTriggerConfig({ ...triggerConfig, minTime: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  {/* Pages Viewed Configuration */}
                  {triggerType === 'WEBSITE_VISITOR_PAGES_VIEWED' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Minimum Pages</Label>
                      <Input
                        type="number"
                        placeholder="3"
                        value={triggerConfig.minPages || ''}
                        onChange={(e) => setTriggerConfig({ ...triggerConfig, minPages: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  {/* Product Configuration */}
                  {triggerType === 'WEBSITE_PRODUCT_PURCHASED' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Product (optional - leave empty for any product)</Label>
                      <Input
                        placeholder="Product SKU or ID"
                        value={triggerConfig.productId || ''}
                        onChange={(e) => setTriggerConfig({ ...triggerConfig, productId: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Customer Tier Configuration */}
                  {triggerType === 'WEBSITE_CUSTOMER_TIER_CHANGED' && (
                    <div className="space-y-2">
                      <Label className="text-xs">To Tier</Label>
                      <Select 
                        value={triggerConfig.toTier || ''} 
                        onValueChange={(value) => setTriggerConfig({ ...triggerConfig, toTier: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="REGULAR">Regular</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Conditional Logic */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Additional Conditions</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setConditionalLogic([...conditionalLogic, { field: '', operator: 'equals', value: '' }])}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Condition
                      </Button>
                    </div>
                    {conditionalLogic.map((condition, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        {index > 0 && (
                          <Select 
                            value={condition.logic || 'AND'} 
                            onValueChange={(value) => {
                              const updated = [...conditionalLogic];
                              updated[index].logic = value as 'AND' | 'OR';
                              setConditionalLogic(updated);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Select 
                          value={condition.field} 
                          onValueChange={(value) => {
                            const updated = [...conditionalLogic];
                            updated[index].field = value;
                            setConditionalLogic(updated);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paymentAmount">Payment Amount</SelectItem>
                            <SelectItem value="customerTier">Customer Tier</SelectItem>
                            <SelectItem value="cartValue">Cart Value</SelectItem>
                            <SelectItem value="productId">Product ID</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select 
                          value={condition.operator} 
                          onValueChange={(value) => {
                            const updated = [...conditionalLogic];
                            updated[index].operator = value;
                            setConditionalLogic(updated);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="greater_than">Greater than</SelectItem>
                            <SelectItem value="less_than">Less than</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Value"
                          value={condition.value || ''}
                          onChange={(e) => {
                            const updated = [...conditionalLogic];
                            updated[index].value = e.target.value;
                            setConditionalLogic(updated);
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setConditionalLogic(conditionalLogic.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
