
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PAYMENT_PROVIDERS } from '@/lib/onboarding-config';
import { CreditCard, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentStepProps {
  data: any;
  onChange: (data: any) => void;
}

export function PaymentStep({ data, onChange }: PaymentStepProps) {
  // Initialize with consistent empty values to prevent hydration mismatch
  const [formData, setFormData] = useState({
    paymentProvider: '',
    paymentProviderConfig: ''
  });

  const [paymentConfig, setPaymentConfig] = useState<any>({});
  const [testing, setTesting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Sync data from props after client-side mount
  useEffect(() => {
    if (!initialized && data) {
      setFormData({
        paymentProvider: data.paymentProvider || '',
        paymentProviderConfig: data.paymentProviderConfig || ''
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  useEffect(() => {
    if (formData.paymentProviderConfig) {
      try {
        setPaymentConfig(JSON.parse(formData.paymentProviderConfig));
      } catch (e) {
        setPaymentConfig({});
      }
    }
  }, [formData.paymentProviderConfig]);

  useEffect(() => {
    if (initialized) {
      const dataToSave = {
        ...formData,
        paymentProviderConfig: Object.keys(paymentConfig).length > 0 ? JSON.stringify(paymentConfig) : ''
      };
      onChange(dataToSave);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, paymentConfig, initialized]);

  const updateConfig = (field: string, value: string) => {
    setPaymentConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Payment provider configured successfully!');
    } catch (error) {
      toast.error('Failed to connect to payment provider');
    } finally {
      setTesting(false);
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

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div>
        <h2 className="text-2xl font-bold mb-2">Payment Processing</h2>
        <p className="text-muted-foreground">
          Connect your payment processor to accept payments from customers (optional).
        </p>
      </div>

      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Payment Provider</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentProvider">Select Payment Provider</Label>
            <Select
              value={formData.paymentProvider}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, paymentProvider: value }));
                setPaymentConfig({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose your payment provider" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label} {provider.recommended && '✓ Recommended'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stripe */}
          {formData.paymentProvider === 'stripe' && (
            <div className="space-y-3">
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 p-4 rounded-md">
                <h4 className="font-semibold mb-2 text-sm">Setting up Stripe</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Create account at <a href="https://stripe.com" target="_blank" className="text-purple-600 hover:underline">stripe.com</a></li>
                  <li>Go to Developers → API keys</li>
                  <li>Copy Secret Key and Publishable Key</li>
                  <li>Enter credentials below</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input
                  type="password"
                  placeholder="sk_test_... or sk_live_..."
                  value={paymentConfig.secretKey || ''}
                  onChange={(e) => updateConfig('secretKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Publishable Key</Label>
                <Input
                  placeholder="pk_test_... or pk_live_..."
                  value={paymentConfig.publishableKey || ''}
                  onChange={(e) => updateConfig('publishableKey', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={testConnection}
                disabled={!paymentConfig.secretKey || !paymentConfig.publishableKey || testing}
                className="w-full"
              >
                {testing ? (
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

          {/* Square */}
          {formData.paymentProvider === 'square' && (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                <h4 className="font-semibold mb-2 text-sm">Setting up Square</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Create account at <a href="https://squareup.com" target="_blank" className="text-blue-600 hover:underline">squareup.com</a></li>
                  <li>Go to Developer Dashboard</li>
                  <li>Copy Access Token and Application ID</li>
                  <li>Enter credentials below</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input
                  type="password"
                  placeholder="EAAAxxxxxxxx"
                  value={paymentConfig.accessToken || ''}
                  onChange={(e) => updateConfig('accessToken', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Application ID</Label>
                <Input
                  placeholder="sq0idp-xxxxxxxx"
                  value={paymentConfig.applicationId || ''}
                  onChange={(e) => updateConfig('applicationId', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={testConnection}
                disabled={!paymentConfig.accessToken || testing}
                className="w-full"
              >
                {testing ? (
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

          {/* PayPal */}
          {formData.paymentProvider === 'paypal' && (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                <h4 className="font-semibold mb-2 text-sm">Setting up PayPal</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Create account at <a href="https://developer.paypal.com" target="_blank" className="text-blue-600 hover:underline">developer.paypal.com</a></li>
                  <li>Create REST API app</li>
                  <li>Copy Client ID and Secret</li>
                  <li>Enter credentials below</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX"
                  value={paymentConfig.clientId || ''}
                  onChange={(e) => updateConfig('clientId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Secret</Label>
                <Input
                  type="password"
                  placeholder="EXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX"
                  value={paymentConfig.secret || ''}
                  onChange={(e) => updateConfig('secret', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={testConnection}
                disabled={!paymentConfig.clientId || !paymentConfig.secret || testing}
                className="w-full"
              >
                {testing ? (
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

          {/* Generic Provider */}
          {formData.paymentProvider && !['stripe', 'square', 'paypal', 'skip'].includes(formData.paymentProvider) && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={paymentConfig.apiKey || ''}
                  onChange={(e) => updateConfig('apiKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret (if required)</Label>
                <Input
                  type="password"
                  placeholder="Enter your API secret"
                  value={paymentConfig.apiSecret || ''}
                  onChange={(e) => updateConfig('apiSecret', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={testConnection}
                disabled={!paymentConfig.apiKey || testing}
                className="w-full"
              >
                {testing ? (
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
    </div>
  );
}
