
'use client';

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  MessageSquare, 
  Users, 
  BarChart, 
  Zap, 
  Brain,
  Calendar,
  CreditCard,
  Mail,
  FileText,
  Globe,
  ShoppingCart,
  TrendingUp,
  Target,
  Bell,
  Workflow,
  Sparkles,
  Lock
} from 'lucide-react';

const features = [
  {
    category: 'AI-Powered Communication',
    icon: Brain,
    color: 'purple',
    items: [
      {
        icon: Phone,
        title: 'AI Voice Agents',
        description: 'Handle up to 200 calls per minute with human-like AI staff. Never miss a call, book appointments automatically, and provide 24/7 customer support across 30+ languages.'
      },
      {
        icon: MessageSquare,
        title: 'Unified Messaging',
        description: 'Manage SMS, email, WhatsApp, Facebook, and Instagram messages from one inbox. AI-powered responses ensure consistent, professional communication.'
      },
      {
        icon: Mail,
        title: 'Email Marketing',
        description: 'Create, schedule, and automate email campaigns with AI-generated content. Track opens, clicks, and conversions in real-time.'
      }
    ]
  },
  {
    category: 'Sales & CRM',
    icon: TrendingUp,
    color: 'pink',
    items: [
      {
        icon: Users,
        title: 'Contact Management',
        description: 'Organize customers, leads, and prospects with custom fields, tags, and segments. AI enriches profiles with behavioral insights.'
      },
      {
        icon: Target,
        title: 'Pipeline Management',
        description: 'Visual pipelines with drag-and-drop deal cards. Automated stage progression based on customer actions and AI recommendations.'
      },
      {
        icon: BarChart,
        title: 'Advanced Analytics',
        description: 'Real-time dashboards, custom reports, and predictive analytics. Track revenue, conversion rates, and team performance.'
      }
    ]
  },
  {
    category: 'Marketing Automation',
    icon: Zap,
    color: 'blue',
    items: [
      {
        icon: Workflow,
        title: 'Workflow Automation',
        description: 'Build complex automation workflows with visual builder. Trigger actions based on customer behavior, time, or custom conditions.'
      },
      {
        icon: Target,
        title: 'Campaign Management',
        description: 'Multi-channel campaigns with A/B testing, audience segmentation, and ROI tracking. AI optimizes send times and content.'
      },
      {
        icon: FileText,
        title: 'Landing Pages & Forms',
        description: 'Create high-converting landing pages and forms without coding. Built-in analytics and optimization suggestions.'
      }
    ]
  },
  {
    category: 'Business Operations',
    icon: Globe,
    color: 'green',
    items: [
      {
        icon: Calendar,
        title: 'Appointment Booking',
        description: 'Automated scheduling with calendar sync, reminders, and no-show reduction. Customers can book via website, SMS, or phone.'
      },
      {
        icon: CreditCard,
        title: 'Payment Processing',
        description: 'Accept payments via credit card, ACH, and digital wallets. Automated invoicing, recurring billing, and payment reminders.'
      },
      {
        icon: ShoppingCart,
        title: 'E-commerce Integration',
        description: 'Connect your store, manage inventory, and automate order fulfillment. Track customer lifetime value and buying patterns.'
      }
    ]
  },
  {
    category: 'Intelligence & Insights',
    icon: Sparkles,
    color: 'yellow',
    items: [
      {
        icon: Brain,
        title: 'AI Assistant',
        description: 'Intelligent copilot trained on your business data. Get instant answers, generate content, and receive strategic recommendations.'
      },
      {
        icon: BarChart,
        title: 'Predictive Analytics',
        description: 'AI forecasts revenue, identifies at-risk customers, and recommends next-best actions. Powered by patented algorithms.'
      },
      {
        icon: Bell,
        title: 'Smart Notifications',
        description: 'Context-aware alerts for important events. AI prioritizes notifications and suggests optimal response actions.'
      }
    ]
  },
  {
    category: 'Security & Compliance',
    icon: Lock,
    color: 'red',
    items: [
      {
        icon: Lock,
        title: 'Enterprise Security',
        description: 'Bank-level encryption, role-based access control, and audit logs. SOC 2 Type II certified infrastructure.'
      },
      {
        icon: FileText,
        title: 'Compliance Tools',
        description: 'GDPR, HIPAA, and CCPA compliance features. Automated consent management and data retention policies.'
      },
      {
        icon: Users,
        title: 'Team Management',
        description: 'User roles, permissions, and activity tracking. Monitor team performance and collaboration.'
      }
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="bg-black min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">All-in-One Platform</span>
            <br />
            <span className="text-white">For Modern Businesses</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you need to capture leads, close deals, and maximize customer lifetime value—powered by patented AI technology
          </p>
        </div>

        {/* Features Grid */}
        <div className="space-y-20">
          {features.map((category, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-${category.color}-500/10`}>
                  <category.icon className={`h-6 w-6 text-${category.color}-400`} />
                </div>
                <h2 className="text-3xl font-bold text-white">{category.category}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.items.map((item, itemIdx) => (
                  <Card key={itemIdx} className="p-6 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all group">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 mb-4 transition-all">
                      <item.icon className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-400">{item.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-24 text-center p-12 rounded-2xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-gray-800">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Experience the Power of AI?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join 90,000+ businesses transforming their operations with our platform
          </p>
          <Link href="/contact">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-12">
              Book a Demo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
