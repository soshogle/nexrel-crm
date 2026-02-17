'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageSquare, ArrowRight } from 'lucide-react';

/**
 * Campaigns hub - redirects to voice campaigns by default or shows campaign type options
 */
export default function CampaignsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage email, SMS, and voice campaigns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/campaigns/voice')}>
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <Phone className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Voice Campaigns</CardTitle>
            <CardDescription>
              Automated AI voice calling campaigns with intelligent scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              Create Voice Campaign
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/campaigns/email-drip')}>
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Email Drip Campaigns</CardTitle>
            <CardDescription>
              Multi-step email sequences with triggers and A/B testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              Create Email Drip
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/campaigns/sms-drip')}>
          <CardHeader>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>SMS Drip Campaigns</CardTitle>
            <CardDescription>
              Automated SMS sequences with reply tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              Create SMS Drip
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
