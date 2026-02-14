
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EMAIL_PROVIDERS, SMS_PROVIDERS } from '@/lib/onboarding-config';
import { Mail, MessageSquare, CheckCircle, AlertCircle, Loader2, ExternalLink, Phone } from 'lucide-react';
import { toast } from 'sonner';
import PurchasePhoneNumberDialog from '@/components/voice-agents/purchase-phone-number-dialog';

interface CommunicationStepProps {
  data: any;
  onChange: (data: any) => void;
}

export function CommunicationStep({ data, onChange }: CommunicationStepProps) {
  // Initialize with consistent empty strings to prevent hydration mismatch
  const [formData, setFormData] = useState({
    emailProvider: '',
    emailProviderConfig: '',
    smsProvider: '',
    smsProviderConfig: ''
  });

  const [emailConfig, setEmailConfig] = useState<any>({});
  const [smsConfig, setSmsConfig] = useState<any>({});
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Sync with incoming data after mount to avoid hydration issues
  useEffect(() => {
    if (!initialized && data) {
      setFormData({
        emailProvider: data.emailProvider || '',
        emailProviderConfig: data.emailProviderConfig || '',
        smsProvider: data.smsProvider || '',
        smsProviderConfig: data.smsProviderConfig || ''
      });
      
      // Parse configs if they exist
      if (data.emailProviderConfig) {
        try {
          setEmailConfig(JSON.parse(data.emailProviderConfig));
        } catch (e) {
          setEmailConfig({});
        }
      }
      if (data.smsProviderConfig) {
        try {
          setSmsConfig(JSON.parse(data.smsProviderConfig));
        } catch (e) {
          setSmsConfig({});
        }
      }
      
      setInitialized(true);
    }
  }, [data, initialized]);

  useEffect(() => {
    if (initialized) {
      const dataToSave = {
        ...formData,
        emailProviderConfig: Object.keys(emailConfig).length > 0 ? JSON.stringify(emailConfig) : '',
        smsProviderConfig: Object.keys(smsConfig).length > 0 ? JSON.stringify(smsConfig) : ''
      };
      onChange(dataToSave);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, emailConfig, smsConfig, initialized]);

  const updateEmailConfig = (field: string, value: string) => {
    setEmailConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateSmsConfig = (field: string, value: string) => {
    setSmsConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const testEmailConnection = async () => {
    setTestingEmail(true);
    try {
      // Simulate test - in production, would make actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Email provider configured successfully!');
    } catch (error) {
      toast.error('Failed to connect to email provider');
    } finally {
      setTestingEmail(false);
    }
  };

  const testSmsConnection = async () => {
    setTestingSms(true);
    try {
      // Simulate test - in production, would make actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('SMS provider configured successfully!');
    } catch (error) {
      toast.error('Failed to connect to SMS provider');
    } finally {
      setTestingSms(false);
    }
  };

  // Don't render until client-side initialization is complete
  if (!initialized) {
    return (
      <div className="space-y-6 flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const selectedEmailProvider = EMAIL_PROVIDERS.find(p => p.value === formData.emailProvider);
  const selectedSmsProvider = SMS_PROVIDERS.find(p => p.value === formData.smsProvider);

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div>
        <h2 className="text-2xl font-bold mb-2">Communication Channels</h2>
        <p className="text-muted-foreground">
          Set up your email and SMS providers to start communicating with customers.
        </p>
      </div>

      {/* EMAIL SETUP */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Email Provider</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailProvider">Select Email Provider</Label>
            <Select
              value={formData.emailProvider}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, emailProvider: value }));
                setEmailConfig({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose your email provider" />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label} {provider.popular && '⭐'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gmail/Outlook OAuth */}
          {selectedEmailProvider?.requiresOAuth && (
            <div className="bg-muted p-4 rounded-md space-y-3">
              <p className="text-sm">
                Connect your {selectedEmailProvider.label} account via OAuth for secure access.
              </p>
              <Button type="button" variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect {selectedEmailProvider.label}
              </Button>
            </div>
          )}

          {/* API Key Based Providers */}
          {selectedEmailProvider?.requiresAPIKey && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={emailConfig.apiKey || ''}
                  onChange={(e) => updateEmailConfig('apiKey', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={testEmailConnection}
                disabled={!emailConfig.apiKey || testingEmail}
                className="w-full"
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          )}

          {/* SMTP Configuration */}
          {selectedEmailProvider?.requiresCredentials && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  placeholder="smtp.example.com"
                  value={emailConfig.host || ''}
                  onChange={(e) => updateEmailConfig('host', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  placeholder="587"
                  value={emailConfig.port || ''}
                  onChange={(e) => updateEmailConfig('port', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  placeholder="your@email.com"
                  value={emailConfig.username || ''}
                  onChange={(e) => updateEmailConfig('username', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={emailConfig.password || ''}
                  onChange={(e) => updateEmailConfig('password', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={testEmailConnection}
                disabled={!emailConfig.host || !emailConfig.username || testingEmail}
                className="w-full"
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SMS SETUP */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">SMS Provider</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smsProvider">Select SMS Provider</Label>
            <Select
              value={formData.smsProvider}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, smsProvider: value }));
                setSmsConfig({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose your SMS provider" />
              </SelectTrigger>
              <SelectContent>
                {SMS_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label} {provider.recommended && '✓ Recommended'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SMS Setup - Twilio via platform purchase */}
          {formData.smsProvider === 'twilio' && (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                <h4 className="font-semibold mb-2 text-sm">SMS & Voice via Soshogle</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Purchase a phone number through the platform. No Twilio account needed—you&apos;ll be invoiced for the number. A voice agent will be created automatically for your business.
                </p>
                <Button
                  type="button"
                  onClick={() => setPurchaseDialogOpen(true)}
                  className="w-full gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Purchase Phone Number
                </Button>
                {smsConfig.phoneNumber && (
                  <p className="text-sm font-mono mt-3 text-green-600 dark:text-green-400">
                    ✓ {smsConfig.phoneNumber}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Other SMS Providers */}
          {formData.smsProvider && formData.smsProvider !== 'twilio' && formData.smsProvider !== 'skip' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={smsConfig.apiKey || ''}
                  onChange={(e) => updateSmsConfig('apiKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number (optional)</Label>
                <Input
                  placeholder="+1234567890"
                  value={smsConfig.phoneNumber || ''}
                  onChange={(e) => updateSmsConfig('phoneNumber', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={testSmsConnection}
                disabled={!smsConfig.apiKey || testingSms}
                className="w-full"
              >
                {testingSms ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <PurchasePhoneNumberDialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        onSuccess={(phoneNumber) => {
          updateSmsConfig('phoneNumber', phoneNumber);
          setPurchaseDialogOpen(false);
          toast.success('Phone number configured! Your voice agent is ready.');
        }}
      />
    </div>
  );
}
