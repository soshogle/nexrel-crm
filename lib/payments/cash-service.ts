
/**
 * Cash Payment Service
 * Handles all business logic for cash payment tracking and reconciliation
 */

import { prisma } from '@/lib/db';
import { CashTransactionType, Prisma } from '@prisma/client';

/**
 * Generate a unique receipt number
 */
function generateReceiptNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CASH-${timestamp}-${random}`;
}

/**
 * Create a cash transaction
 */
export async function createCashTransaction(data: {
  userId: string;
  merchantId?: string;
  type: CashTransactionType;
  amount: number; // in cents
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  transactionDate?: Date;
  notes?: string;
  createdBy: string;
  metadata?: any;
}) {
  const receiptNumber = generateReceiptNumber();

  return await prisma.cashTransaction.create({
    data: {
      ...data,
      receiptNumber,
      transactionDate: data.transactionDate || new Date(),
    },
  });
}

/**
 * Get cash transactions for a user
 */
export async function getCashTransactions(
  userId: string,
  filters?: {
    type?: CashTransactionType;
    startDate?: Date;
    endDate?: Date;
    isReconciled?: boolean;
    merchantId?: string;
  }
) {
  const where: Prisma.CashTransactionWhereInput = {
    userId,
    deletedAt: null,
  };

  if (filters) {
    if (filters.type) where.type = filters.type;
    if (filters.merchantId) where.merchantId = filters.merchantId;
    if (filters.isReconciled !== undefined) where.isReconciled = filters.isReconciled;
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate.gte = filters.startDate;
      if (filters.endDate) where.transactionDate.lte = filters.endDate;
    }
  }

  return await prisma.cashTransaction.findMany({
    where,
    orderBy: { transactionDate: 'desc' },
    include: {
      reconciliation: true,
    },
  });
}

/**
 * Update a cash transaction
 */
export async function updateCashTransaction(
  id: string,
  data: {
    type?: CashTransactionType;
    amount?: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    transactionDate?: Date;
    notes?: string;
    updatedBy: string;
    metadata?: any;
  }
) {
  return await prisma.cashTransaction.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Soft delete a cash transaction
 */
export async function deleteCashTransaction(id: string, deletedBy: string) {
  return await prisma.cashTransaction.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedBy: deletedBy,
    },
  });
}

/**
 * Calculate reconciliation summary for a date range
 */
export async function calculateReconciliationSummary(
  userId: string,
  startDate: Date,
  endDate: Date,
  merchantId?: string
) {
  const where: Prisma.CashTransactionWhereInput = {
    userId,
    deletedAt: null,
    isReconciled: false,
    transactionDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (merchantId) {
    where.merchantId = merchantId;
  }

  const transactions = await prisma.cashTransaction.findMany({
    where,
  });

  const summary = {
    totalSales: 0,
    totalRefunds: 0,
    totalExpenses: 0,
    totalAdjustments: 0,
    transactionCount: transactions.length,
  };

  transactions.forEach((txn) => {
    switch (txn.type) {
      case 'SALE':
        summary.totalSales += txn.amount;
        break;
      case 'REFUND':
        summary.totalRefunds += txn.amount;
        break;
      case 'EXPENSE':
        summary.totalExpenses += txn.amount;
        break;
      case 'ADJUSTMENT':
        summary.totalAdjustments += txn.amount;
        break;
    }
  });

  return summary;
}

/**
 * Create a cash reconciliation
 */
export async function createCashReconciliation(data: {
  userId: string;
  merchantId?: string;
  startDate: Date;
  endDate: Date;
  startingCash: number; // in cents
  actualCash: number; // in cents
  notes?: string;
  createdBy: string;
  metadata?: any;
}) {
  // Calculate summary from transactions
  const summary = await calculateReconciliationSummary(
    data.userId,
    data.startDate,
    data.endDate,
    data.merchantId
  );

  // Calculate expected cash
  const expectedCash =
    data.startingCash +
    summary.totalSales -
    summary.totalRefunds -
    summary.totalExpenses +
    summary.totalAdjustments;

  // Calculate discrepancy
  const discrepancy = data.actualCash - expectedCash;

  // Create reconciliation
  const reconciliation = await prisma.cashReconciliation.create({
    data: {
      userId: data.userId,
      merchantId: data.merchantId,
      reconciliationDate: new Date(),
      startDate: data.startDate,
      endDate: data.endDate,
      startingCash: data.startingCash,
      expectedCash,
      actualCash: data.actualCash,
      discrepancy,
      totalSales: summary.totalSales,
      totalRefunds: summary.totalRefunds,
      totalExpenses: summary.totalExpenses,
      totalAdjustments: summary.totalAdjustments,
      transactionCount: summary.transactionCount,
      notes: data.notes,
      status: 'COMPLETED',
      createdBy: data.createdBy,
      metadata: data.metadata,
    },
  });

  // Mark all transactions in the period as reconciled
  await prisma.cashTransaction.updateMany({
    where: {
      userId: data.userId,
      deletedAt: null,
      isReconciled: false,
      transactionDate: {
        gte: data.startDate,
        lte: data.endDate,
      },
      ...(data.merchantId && { merchantId: data.merchantId }),
    },
    data: {
      isReconciled: true,
      reconciliationId: reconciliation.id,
    },
  });

  return reconciliation;
}

/**
 * Get cash reconciliations for a user
 */
export async function getCashReconciliations(
  userId: string,
  filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    merchantId?: string;
  }
) {
  const where: Prisma.CashReconciliationWhereInput = {
    userId,
  };

  if (filters) {
    if (filters.status) where.status = filters.status;
    if (filters.merchantId) where.merchantId = filters.merchantId;
    if (filters.startDate || filters.endDate) {
      where.reconciliationDate = {};
      if (filters.startDate) where.reconciliationDate.gte = filters.startDate;
      if (filters.endDate) where.reconciliationDate.lte = filters.endDate;
    }
  }

  return await prisma.cashReconciliation.findMany({
    where,
    orderBy: { reconciliationDate: 'desc' },
    include: {
      transactions: true,
    },
  });
}

/**
 * Get a single reconciliation by ID
 */
export async function getCashReconciliation(id: string) {
  return await prisma.cashReconciliation.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
      },
    },
  });
}

/**
 * Update reconciliation status
 */
export async function updateReconciliationStatus(
  id: string,
  data: {
    status: string;
    notes?: string;
    reviewedBy?: string;
    updatedBy: string;
  }
) {
  return await prisma.cashReconciliation.update({
    where: { id },
    data: {
      status: data.status,
      notes: data.notes,
      reviewedBy: data.reviewedBy,
      reviewedAt: data.reviewedBy ? new Date() : undefined,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get cash transaction statistics
 */
export async function getCashStatistics(
  userId: string,
  startDate: Date,
  endDate: Date,
  merchantId?: string
) {
  const where: Prisma.CashTransactionWhereInput = {
    userId,
    deletedAt: null,
    transactionDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (merchantId) {
    where.merchantId = merchantId;
  }

  const transactions = await prisma.cashTransaction.findMany({
    where,
  });

  const stats = {
    totalRevenue: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    transactionCount: transactions.length,
    reconciledCount: 0,
    unreconciledCount: 0,
    averageTransactionSize: 0,
    salesByDay: {} as Record<string, number>,
  };

  transactions.forEach((txn) => {
    if (txn.type === 'SALE') {
      stats.totalRevenue += txn.amount;
    } else if (txn.type === 'EXPENSE' || txn.type === 'REFUND') {
      stats.totalExpenses += txn.amount;
    }

    if (txn.isReconciled) {
      stats.reconciledCount++;
    } else {
      stats.unreconciledCount++;
    }

    // Track sales by day
    const dateKey = txn.transactionDate.toISOString().split('T')[0];
    if (!stats.salesByDay[dateKey]) {
      stats.salesByDay[dateKey] = 0;
    }
    if (txn.type === 'SALE') {
      stats.salesByDay[dateKey] += txn.amount;
    }
  });

  stats.netCashFlow = stats.totalRevenue - stats.totalExpenses;
  stats.averageTransactionSize =
    stats.transactionCount > 0 ? stats.totalRevenue / stats.transactionCount : 0;

  return stats;
}

/**
 * Export cash transactions to CSV format
 */
export function exportCashTransactionsToCSV(
  transactions: Array<{
    receiptNumber: string | null;
    transactionDate: Date;
    type: CashTransactionType;
    amount: number;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    notes: string | null;
    isReconciled: boolean;
  }>
) {
  const headers = [
    'Receipt Number',
    'Date',
    'Type',
    'Amount',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Notes',
    'Reconciled',
  ];

  const rows = transactions.map((txn) => [
    txn.receiptNumber || '',
    txn.transactionDate.toISOString(),
    txn.type,
    (txn.amount / 100).toFixed(2),
    txn.customerName || '',
    txn.customerPhone || '',
    txn.customerEmail || '',
    txn.notes || '',
    txn.isReconciled ? 'Yes' : 'No',
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

  return csvContent;
}
