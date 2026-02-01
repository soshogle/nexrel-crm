export const dynamic = 'force-dynamic';


/**
 * Payment Analytics Page
 * Comprehensive revenue tracking and insights
 */

import { PaymentAnalyticsDashboard } from '@/components/payments/payment-analytics-dashboard';

export default function PaymentAnalyticsPage() {
  return (
    <div className="container mx-auto py-6">
      <PaymentAnalyticsDashboard />
    </div>
  );
}
