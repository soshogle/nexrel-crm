'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageSquare, ArrowRight, Workflow, Sparkles } from 'lucide-react';

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

      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push('/dashboard/campaigns/builder')}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <Workflow className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Campaign Builder</CardTitle>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">New</span>
              </div>
              <CardDescription>
                Drag-and-drop canvas builder for Email & SMS drip campaigns. Like the Workflow Builder.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-between border-purple-300 text-purple-700 hover:bg-purple-50">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Create with Canvas Builder
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

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
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-between" onClick={(e) => { e.stopPropagation(); router.push('/dashboard/campaigns/builder'); }}>
              Canvas Builder
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="w-full justify-between" onClick={(e) => { e.stopPropagation(); router.push('/dashboard/campaigns/email-drip/create'); }}>
              Form-based Create
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
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-between" onClick={(e) => { e.stopPropagation(); router.push('/dashboard/campaigns/builder'); }}>
              Canvas Builder
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="w-full justify-between" onClick={(e) => { e.stopPropagation(); router.push('/dashboard/campaigns/sms-drip/create'); }}>
              Form-based Create
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
