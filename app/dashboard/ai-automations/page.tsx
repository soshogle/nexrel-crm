'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Workflow,
  Zap,
  Users,
  Mail,
  MessageSquare,
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Play,
  Settings,
  BarChart3,
} from 'lucide-react';

export default function AIAutomationsPage() {
  const router = useRouter();

  const features = [
    {
      icon: Workflow,
      title: 'Visual Workflow Builder',
      description: 'Drag-and-drop interface to create complex automation workflows',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Users,
      title: 'Campaign Mode',
      description: 'Send messages to thousands of leads with advanced targeting',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Mail,
      title: 'Email Campaigns',
      description: 'Create and track email campaigns with open/click analytics',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: MessageSquare,
      title: 'SMS Campaigns',
      description: 'Send targeted SMS messages with delivery and reply tracking',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: Calendar,
      title: 'Automated Sequences',
      description: 'Multi-step automation sequences with delays and conditions',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Insights',
      description: 'Track performance metrics and optimize your automations',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  const useCases = [
    {
      title: 'Customer Onboarding',
      description: 'Automate welcome emails, setup calls, and follow-up sequences',
    },
    {
      title: 'Lead Nurturing',
      description: 'Engage leads with personalized messages based on their behavior',
    },
    {
      title: 'Marketing Campaigns',
      description: 'Launch email and SMS campaigns to thousands of recipients',
    },
    {
      title: 'Appointment Reminders',
      description: 'Send automated reminders via email and SMS before appointments',
    },
    {
      title: 'Follow-up Sequences',
      description: 'Automatically follow up with customers after purchases or interactions',
    },
    {
      title: 'Re-engagement Campaigns',
      description: 'Reconnect with inactive customers through targeted campaigns',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text">AI Automations</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Create powerful workflows and campaigns to automate your business processes.
          Build once, run forever.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            size="lg"
            onClick={() => router.push('/dashboard/ai-employees?tab=workflows')}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-8 py-6 text-lg"
          >
            <Play className="h-5 w-5 mr-2" />
            Open Workflow Builder
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push('/dashboard/campaigns')}
            className="px-8 py-6 text-lg"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            View Campaigns
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-center">Powerful Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-center">Common Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((useCase, index) => (
            <Card key={index} className="border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{useCase.title}</h3>
                    <p className="text-sm text-muted-foreground">{useCase.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6 text-purple-600" />
            Quick Start Guide
          </CardTitle>
          <CardDescription>
            Get started with AI Automations in 3 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <Badge className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-purple-600">
              1
            </Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Choose Your Mode</h3>
              <p className="text-sm text-muted-foreground">
                Select <strong>Workflow</strong> for single-customer automation or <strong>Campaign</strong> for batch messaging
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Badge className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-purple-600">
              2
            </Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Build Your Automation</h3>
              <p className="text-sm text-muted-foreground">
                Use drag-and-drop to add steps: emails, SMS, calls, tasks, and more
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Badge className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-purple-600">
              3
            </Badge>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Configure & Launch</h3>
              <p className="text-sm text-muted-foreground">
                Set your audience, schedule, and rate limits, then launch your automation
              </p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <Button
              onClick={() => router.push('/dashboard/ai-employees?tab=workflows')}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
              size="lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Building Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-blue-600" />
              Workflow Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Perfect for automating processes for individual customers. Triggered by events like signups, purchases, or status changes.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Customer onboarding sequences
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Event-triggered automations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                Multi-step customer journeys
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Campaign Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ideal for marketing campaigns targeting many recipients. Includes advanced targeting, scheduling, and analytics.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                Email & SMS campaigns
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                Lead score filtering
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                Performance analytics
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
