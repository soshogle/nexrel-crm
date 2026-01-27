
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Building2,
  MapPin,
  Users,
  DollarSign,
  Mail,
  MessageSquare,
  CreditCard,
  Sparkles,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ReviewLaunchStepProps {
  allData: any;
  onComplete: () => void;
}

export function ReviewLaunchStep({ allData, onComplete }: ReviewLaunchStepProps) {
  const [testQuestion, setTestQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [testing, setTesting] = useState(false);
  const [launching, setLaunching] = useState(false);

  const testAI = async () => {
    if (!testQuestion.trim()) {
      toast.error('Please enter a question to test');
      return;
    }

    setTesting(true);
    try {
      // Simulate AI response - in production, would call actual AI API
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAiResponse(
        `Based on your business profile, here's how I can help:\n\n` +
        `As a ${allData.businessCategory || 'business'} specializing in ${allData.industryNiche || 'your industry'}, ` +
        `I can assist with managing your ${allData.targetAudience || 'customers'} and optimizing your ` +
        `${allData.primaryMarketingChannel || 'marketing channels'}. Would you like me to help you create a campaign?`
      );
      toast.success('AI test successful!');
    } catch (error) {
      toast.error('Failed to test AI');
    } finally {
      setTesting(false);
    }
  };

  const launchCRM = async () => {
    setLaunching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('CRM setup complete! Redirecting to dashboard...');
      onComplete();
    } catch (error) {
      toast.error('Failed to complete setup');
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review & Launch</h2>
        <p className="text-muted-foreground">
          Review your configuration and test your AI assistant before launching.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Business Profile */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Business Profile</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Category:</span>{' '}
              <span className="font-medium">{allData.businessCategory || 'Not set'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Niche:</span>{' '}
              <span className="font-medium">{allData.industryNiche || 'Not set'}</span>
            </div>
            <div className="flex items-start gap-1">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span className="font-medium">{allData.operatingLocation || 'Not set'}</span>
            </div>
            <div className="flex items-start gap-1">
              <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span className="font-medium">{allData.teamSize || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Sales Configuration */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Sales Setup</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Avg Deal:</span>{' '}
              <span className="font-medium">
                {allData.currency || '$'} {allData.averageDealValue || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cycle:</span>{' '}
              <span className="font-medium">{allData.salesCycleLength || 'Not set'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contact Method:</span>{' '}
              <span className="font-medium">{allData.preferredContactMethod || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Communication */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Communication</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {allData.emailProvider === 'skip' ? 'Skipped' : allData.emailProvider || 'Not configured'}
              </span>
              {allData.emailProviderConfig && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {allData.smsProvider === 'skip' ? 'Skipped' : allData.smsProvider || 'Not configured'}
              </span>
              {allData.smsProviderConfig && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Payment Processing</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {allData.paymentProvider === 'skip' ? 'Skipped' : allData.paymentProvider || 'Not configured'}
              </span>
              {allData.paymentProviderConfig && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
          </div>
        </div>
      </div>

      {/* AI Testing */}
      <div className="border border-border rounded-lg p-4 space-y-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Test Your AI Assistant</h3>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="testQuestion">Ask the AI a question</Label>
            <Textarea
              id="testQuestion"
              placeholder="Try asking: 'What services do we offer?' or 'How can you help me with leads?'"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            type="button"
            onClick={testAI}
            disabled={testing || !testQuestion.trim()}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Test AI Assistant
              </>
            )}
          </Button>

          {aiResponse && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">AI Response:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{aiResponse}</p>
            </div>
          )}
        </div>
      </div>

      {/* Launch Button */}
      <Button
        type="button"
        onClick={launchCRM}
        disabled={launching}
        size="lg"
        className="w-full text-lg h-14"
      >
        {launching ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Launching Your CRM...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Complete Setup & Launch CRM
          </>
        )}
      </Button>
    </div>
  );
}
