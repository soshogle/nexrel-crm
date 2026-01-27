'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Home, DollarSign } from 'lucide-react';

export default function MarketInsightsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-500 rounded-xl">
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Market Insights</h1>
          <p className="text-muted-foreground">Real-time market data and trends</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Median Home Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$425,000</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              +5.2% YoY
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Days on Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingDown className="h-4 w-4 mr-1" />
              -3 days
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <div className="flex items-center text-red-500 text-sm">
              <TrendingDown className="h-4 w-4 mr-1" />
              -8.3% MoM
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12.1% MoM
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Market Trends</CardTitle>
          <CardDescription>Historical and projected market data for your area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Market Charts Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Interactive charts showing price trends, inventory levels, and market predictions 
              will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
