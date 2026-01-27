
/**
 * Payment Transactions Page
 */

import { TransactionHistory } from '@/components/payments/transaction-history';

export default function TransactionsPage() {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your payment transactions
        </p>
      </div>

      <TransactionHistory />
    </div>
  );
}
