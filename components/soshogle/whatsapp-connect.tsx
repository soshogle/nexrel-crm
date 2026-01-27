'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, CheckCircle2, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppConnectProps {
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

export function WhatsAppConnect({ onConnectionSuccess, onDisconnect }: WhatsAppConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/soshogle/whatsapp/status');
      if (response.ok) {
        const data = await response.json();
        console.log('💚 WhatsApp status:', data);
        if (data.isConnected && data.connection) {
          setIsConnected(true);
          setPhoneNumber(data.connection.phoneNumber || 'WhatsApp Business');
        }
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!phoneNumberId || !accessToken || !businessAccountId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/soshogle/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId,
          accessToken,
          businessAccountId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect WhatsApp');
      }

      const data = await response.json();
      setIsConnected(true);
      setPhoneNumber(data.connection.displayName);
      setShowForm(false);
      toast.success('WhatsApp Business connected successfully!');
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
    } catch (error: any) {
      console.error('WhatsApp connection error:', error);
      toast.error(error.message || 'Failed to connect WhatsApp');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/soshogle/whatsapp/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect WhatsApp');
      }

      setIsConnected(false);
      setPhoneNumber('');
      toast.success('WhatsApp Business disconnected');
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error: any) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error(error.message || 'Failed to disconnect WhatsApp');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border-green-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-600 p-3">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">WhatsApp Business Connected</CardTitle>
                <CardDescription>Manage WhatsApp conversations</CardDescription>
              </div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gradient-to-r from-green-600/10 to-green-400/10 p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Connected Number</p>
                <p className="text-lg font-semibold text-white">{phoneNumber}</p>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect WhatsApp'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect WhatsApp Business?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove access to your WhatsApp Business conversations. You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-600 p-3">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Connect WhatsApp Business</CardTitle>
              <CardDescription>Enter your WhatsApp Business API credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
            <Input
              id="phoneNumberId"
              placeholder="123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token *</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="EAAG..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessAccountId">Business Account ID *</Label>
            <Input
              id="businessAccountId"
              placeholder="123456789012345"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
            <p className="text-xs text-blue-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Find these values in your Meta Business Suite under WhatsApp Business Platform settings.
              <a
                href="https://business.facebook.com/latest/whatsapp_manager"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
              >
                Open Meta Business Suite
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleConnect}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-600 p-3">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Connect WhatsApp Business</CardTitle>
            <CardDescription>Enable WhatsApp messaging in Soshogle</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-gray-400">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            Send and receive WhatsApp Business messages
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            Unified conversation inbox
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            Automated responses and campaigns
          </p>
        </div>

        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Connect WhatsApp Business
        </Button>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
          <p className="text-xs text-blue-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            You'll need a WhatsApp Business API account. Don't have one?
            <a
              href="https://business.facebook.com/latest/whatsapp_manager"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
            >
              Get started
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
