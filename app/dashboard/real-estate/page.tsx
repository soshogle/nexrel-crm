'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, UserPlus, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import Link from 'next/link';

const realEstateFeatures = [
  {
    title: 'FSBO Leads',
    description: 'Find For Sale By Owner listings and convert them to clients',
    icon: UserPlus,
    href: '/dashboard/real-estate/fsbo-leads',
    color: 'bg-blue-500',
  },
  {
    title: 'CMA Tools',
    description: 'Generate Comparative Market Analysis reports',
    icon: TrendingUp,
    href: '/dashboard/real-estate/cma',
    color: 'bg-green-500',
  },
  {
    title: 'Market Insights',
    description: 'Real-time market data and trends',
    icon: BarChart3,
    href: '/dashboard/real-estate/market-insights',
    color: 'bg-purple-500',
  },
  {
    title: 'Seller Net Sheet',
    description: 'Calculate seller proceeds and closing costs',
    icon: DollarSign,
    href: '/dashboard/real-estate/net-sheet',
    color: 'bg-orange-500',
  },
  {
    title: 'RE Analytics',
    description: 'Track your real estate performance metrics',
    icon: TrendingUp,
    href: '/dashboard/real-estate/analytics',
    color: 'bg-pink-500',
  },
];

export default function RealEstateDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
          <Home className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Real Estate Hub</h1>
          <p className="text-muted-foreground">Your complete real estate toolkit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {realEstateFeatures.map((feature) => (
          <Link key={feature.title} href={feature.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-3`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Coming Soon
          </CardTitle>
          <CardDescription>
            More real estate features are being developed, including MLS integration, 
            automated listing presentations, and AI-powered market predictions.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
