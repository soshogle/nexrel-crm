
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function WhatsAppSettings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const [formData, setFormData] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/integrations/whatsapp/configure');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.configured || false);
      }
    } catch (error) {
      console.error('Error checking WhatsApp connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.accountSid || !formData.authToken || !formData.phoneNumber) {
      toast.error('All fields are required');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/integrations/whatsapp/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save WhatsApp configuration');
      }

      toast.success('WhatsApp configured successfully!');
      setIsConnected(true);
      setFormData({ accountSid: '', authToken: '', phoneNumber: '' });
      setShowCredentials(false);
    } catch (error) {
      console.error('WhatsApp configuration error:', error);
      toast.error('Failed to configure WhatsApp');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Business
          </CardTitle>
          <CardDescription>
            Connect WhatsApp Business to message customers on their preferred platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                WhatsApp is connected and ready to use
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                Configure WhatsApp Business API to send and receive messages through WhatsApp
              </AlertDescription>
            </Alert>
          )}

          {!isConnected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountSid">Account SID</Label>
                <Input
                  id="accountSid"
                  type={showCredentials ? 'text' : 'password'}
                  value={formData.accountSid}
                  onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authToken">Auth Token</Label>
                <div className="relative">
                  <Input
                    id="authToken"
                    type={showCredentials ? 'text' : 'password'}
                    value={formData.authToken}
                    onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredentials(!showCredentials)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">WhatsApp-Enabled Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                />
                <p className="text-sm text-gray-500">
                  Must be a phone number with WhatsApp Business enabled
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <h4 className="font-medium">Features:</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Send and receive WhatsApp messages with customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Share images, videos, and documents via WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Set up auto-replies for WhatsApp messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Run WhatsApp marketing campaigns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Let AI assistant send WhatsApp messages on your behalf</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">1. Get WhatsApp-Enabled Number:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Your WhatsApp Business number will be automatically configured through Soshogle.
              Simply enter your account details and start messaging your customers.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. Find Your Credentials:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Your account credentials are managed through Soshogle's secure infrastructure.
              Contact support if you need assistance with setup.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">3. Configure Webhook:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Set your WhatsApp webhook URL to: <br />
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/whatsapp/webhook
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
