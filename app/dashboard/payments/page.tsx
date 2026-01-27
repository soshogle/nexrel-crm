
/**
 * Payments Dashboard Page
 * Comprehensive payment management with analytics
 */

'use client';

import { WalletCard } from '@/components/payments/wallet-card';
import { PaymentMethodsManager } from '@/components/payments/payment-methods-manager';
import { TransactionHistory } from '@/components/payments/transaction-history';
import { LoyaltyPointsCard } from '@/components/payments/loyalty-points-card';
import { QuickPayButton } from '@/components/payments/quick-pay-button';
import { PaymentAnalyticsDashboard } from '@/components/payments/payment-analytics-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, BarChart3, FileText, Settings as SettingsIcon } from 'lucide-react';

export default function PaymentsDashboardPage() {
  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground mt-2">
            Manage your payments, analytics, wallet, and rewards
          </p>
        </div>

        <QuickPayButton amount={10.0} description="Test quick payment" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <WalletCard />
            <LoyaltyPointsCard />
          </div>

          <PaymentMethodsManager />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <TransactionHistory />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PaymentAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <TransactionHistory />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Payment Settings</h3>
            <p className="text-muted-foreground">
              Configure your payment preferences, billing, and merchant settings
            </p>
            <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
