
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageSquare, CreditCard, Calendar, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface IntegrationSetupProps {
  type: 'email' | 'sms' | 'social' | 'payment' | 'calendar';
  onComplete: (data: any) => void;
}

export function IntegrationSetup({ type, onComplete }: IntegrationSetupProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const handleConnect = async (provider: string) => {
    setIsConnecting(true);
    
    try {
      if (type === 'email' && (provider === 'gmail' || provider === 'outlook')) {
        // OAuth flow for email providers
        toast.info(`Connecting to ${provider}...`);
        // Simulate OAuth - in production, this would open OAuth window
        setTimeout(() => {
          onComplete({ provider, connected: true });
          toast.success(`${provider} connected successfully!`);
          setIsConnecting(false);
        }, 2000);
      } else if (type === 'sms') {
        // Twilio setup
        onComplete({ provider: 'twilio', ...formData });
        toast.success("Twilio configuration saved!");
        setIsConnecting(false);
      } else if (type === 'payment') {
        // Payment provider setup
        onComplete({ provider, ...formData });
        toast.success(`${provider} configuration saved!`);
        setIsConnecting(false);
      } else if (type === 'social') {
        // Social media OAuth
        toast.info(`Connecting to ${provider}...`);
        setTimeout(() => {
          onComplete({ provider, connected: true });
          toast.success(`${provider} connected successfully!`);
          setIsConnecting(false);
        }, 2000);
      } else if (type === 'calendar') {
        // Calendar OAuth
        toast.info(`Connecting to ${provider}...`);
        setTimeout(() => {
          onComplete({ provider, connected: true });
          toast.success(`${provider} connected successfully!`);
          setIsConnecting(false);
        }, 2000);
      }
    } catch (error) {
      toast.error("Connection failed. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    onComplete({ skipped: true });
  };

  if (type === 'email') {
    return (
      <Card className="border-2 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Email Provider Setup</CardTitle>
              <CardDescription>Connect your email for customer communications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('gmail')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
              <span className="font-semibold">Gmail</span>
              <Badge variant="secondary" className="text-xs">Recommended</Badge>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('outlook')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
              <span className="font-semibold">Outlook</span>
            </Button>
          </div>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Skip for now
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'sms') {
    return (
      <Card className="border-2 border-green-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>SMS & Phone Setup</CardTitle>
              <CardDescription>Configure Twilio for SMS communications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="twilio-sid">Twilio Account SID</Label>
              <Input
                id="twilio-sid"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={formData.accountSid || ''}
                onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-token">Twilio Auth Token</Label>
              <Input
                id="twilio-token"
                type="password"
                placeholder="Your auth token"
                value={formData.authToken || ''}
                onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-phone">Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="twilio-phone"
                  placeholder="+1234567890"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
                <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                  <ExternalLink className="h-4 w-4" />
                  Buy Number
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleConnect('twilio')}
              disabled={isConnecting || !formData.accountSid}
              className="flex-1"
            >
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Don't have Twilio? <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sign up here</a>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (type === 'social') {
    return (
      <Card className="border-2 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Social Media Messaging</CardTitle>
              <CardDescription>Connect social platforms for unified inbox</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('facebook')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
              <span className="font-semibold">Facebook</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('instagram')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
              <span className="font-semibold">Instagram</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('whatsapp')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
              <span className="font-semibold">WhatsApp</span>
            </Button>
          </div>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Skip for now
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'payment') {
    return (
      <Card className="border-2 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Payment Processing</CardTitle>
              <CardDescription>Accept payments from your customers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('stripe')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              <span className="font-semibold text-sm">Stripe</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('square')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              <span className="font-semibold text-sm">Square</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('paypal')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              <span className="font-semibold text-sm">PayPal</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('apple-pay')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              <span className="font-semibold text-sm">Apple Pay</span>
            </Button>
          </div>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Skip for now
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (type === 'calendar') {
    return (
      <Card className="border-2 border-orange-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Sync appointments with your calendar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('google-calendar')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
              <span className="font-semibold">Google Calendar</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('outlook-calendar')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
              <span className="font-semibold">Outlook Calendar</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => handleConnect('apple-calendar')}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
              <span className="font-semibold">Apple Calendar</span>
            </Button>
          </div>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Skip for now
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
