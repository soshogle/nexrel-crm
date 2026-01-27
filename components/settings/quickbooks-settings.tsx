
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, ExternalLink, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export function QuickBooksSettings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.quickbooksConfigured || false);
      }
    } catch (error) {
      console.error('Error checking QuickBooks connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch('/api/integrations/quickbooks/connect');
      
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }

      const data = await response.json();
      
      if (data.authUrl) {
        // Open QuickBooks OAuth in new window
        window.location.href = data.authUrl;
      } else {
        throw new Error('Auth URL not provided');
      }
    } catch (error) {
      console.error('QuickBooks connection error:', error);
      toast.error('Failed to connect to QuickBooks');
    } finally {
      setIsConnecting(false);
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
            <DollarSign className="w-5 h-5" />
            QuickBooks Online
          </CardTitle>
          <CardDescription>
            Connect your QuickBooks account to automate invoicing and sync customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                QuickBooks is connected and ready to use
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                Connect QuickBooks to automatically create invoices from deals and sync customer data
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Features:</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Automatically sync contacts as QuickBooks customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Create invoices directly from deals in your pipeline</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Track payment status and update deal stages automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Let AI assistant create and send invoices on your behalf</span>
                </li>
              </ul>
            </div>

            {!isConnected && (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Connect QuickBooks
                  </>
                )}
              </Button>
            )}

            {isConnected && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={checkConnection}
                  className="gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Refresh Status
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Use QuickBooks Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">1. In the AI Assistant:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Ask the AI to &quot;Create an invoice for [contact name]&quot; or &quot;Send invoice to [customer]&quot;
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. In the Pipeline:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Click the invoice button on any deal to automatically create a QuickBooks invoice
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">3. In Contacts:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Contacts are automatically synced as customers when you create an invoice
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
