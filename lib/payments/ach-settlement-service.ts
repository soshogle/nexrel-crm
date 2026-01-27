
/**
 * ACH Settlement Service (Simulation Mode)
 * Handles ACH batch processing, settlement tracking, and payout management
 */

import { prisma } from '@/lib/db';
import { AchSettlementStatus, AchTransactionType } from '@prisma/client';

export interface CreateSettlementParams {
  userId: string;
  settlementDate: Date;
  totalAmount: number; // in cents
  transactionCount: number;
  bankName?: string;
  accountLast4?: string;
  routingNumber?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateTransactionParams {
  settlementId: string;
  transactionType: AchTransactionType;
  amount: number; // in cents
  recipientName: string;
  recipientAccount?: string;
  recipientEmail?: string;
  description?: string;
  referenceNumber?: string;
  metadata?: Record<string, any>;
}

export interface ProcessSettlementResult {
  success: boolean;
  settlementId: string;
  processedCount: number;
  failedCount: number;
  totalProcessed: number;
  errors?: string[];
}

export class AchSettlementService {
  /**
   * Create a new ACH settlement batch
   */
  static async createSettlement(params: CreateSettlementParams) {
    const batchId = `ACH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Calculate processing fee (simulation: 0.5% of total amount, min $0.25, max $5.00)
    const processingFee = Math.min(
      Math.max(Math.floor(params.totalAmount * 0.005), 25),
      500
    );
    const netAmount = params.totalAmount - processingFee;

    const settlement = await prisma.achSettlement.create({
      data: {
        userId: params.userId,
        batchId,
        settlementDate: params.settlementDate,
        totalAmount: params.totalAmount,
        transactionCount: params.transactionCount,
        processingFee,
        netAmount,
        bankName: params.bankName,
        accountLast4: params.accountLast4,
        routingNumber: params.routingNumber,
        notes: params.notes,
        metadata: params.metadata || {},
      },
    });

    return settlement;
  }

  /**
   * Add transaction to settlement batch
   */
  static async addTransaction(params: CreateTransactionParams) {
    const transaction = await prisma.achSettlementTransaction.create({
      data: {
        settlementId: params.settlementId,
        transactionType: params.transactionType,
        amount: params.amount,
        recipientName: params.recipientName,
        recipientAccount: params.recipientAccount,
        recipientEmail: params.recipientEmail,
        description: params.description,
        referenceNumber: params.referenceNumber,
        metadata: params.metadata || {},
      },
    });

    return transaction;
  }

  /**
   * Process settlement batch (simulation)
   */
  static async processSettlement(settlementId: string): Promise<ProcessSettlementResult> {
    const settlement = await prisma.achSettlement.findUnique({
      where: { id: settlementId },
      include: { transactions: true },
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    if (settlement.status !== AchSettlementStatus.PENDING) {
      throw new Error(`Cannot process settlement with status: ${settlement.status}`);
    }

    // Update settlement to processing
    await prisma.achSettlement.update({
      where: { id: settlementId },
      data: {
        status: AchSettlementStatus.PROCESSING,
        processedAt: new Date(),
      },
    });

    // Simulate processing each transaction
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const transaction of settlement.transactions) {
      try {
        // Simulation: 95% success rate
        const isSuccess = Math.random() > 0.05;

        if (isSuccess) {
          await prisma.achSettlementTransaction.update({
            where: { id: transaction.id },
            data: {
              status: AchSettlementStatus.COMPLETED,
              processedAt: new Date(),
              traceNumber: `TRC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            },
          });
          successCount++;
        } else {
          // Simulate failure
          const failureReasons = [
            'Insufficient funds',
            'Invalid account number',
            'Account closed',
            'Routing number invalid',
          ];
          const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

          await prisma.achSettlementTransaction.update({
            where: { id: transaction.id },
            data: {
              status: AchSettlementStatus.FAILED,
              processedAt: new Date(),
              failureReason,
            },
          });
          failedCount++;
          errors.push(`Transaction ${transaction.id}: ${failureReason}`);
        }
      } catch (error) {
        failedCount++;
        errors.push(`Transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update settlement with final status
    const finalStatus = failedCount === 0 
      ? AchSettlementStatus.COMPLETED 
      : failedCount === settlement.transactions.length
        ? AchSettlementStatus.FAILED
        : AchSettlementStatus.COMPLETED; // Partial success still marked as completed

    await prisma.achSettlement.update({
      where: { id: settlementId },
      data: {
        status: finalStatus,
        successCount,
        failedCount,
        completedAt: new Date(),
        failureReason: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    return {
      success: failedCount === 0,
      settlementId,
      processedCount: successCount,
      failedCount,
      totalProcessed: successCount + failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get settlement by ID with transactions
   */
  static async getSettlement(settlementId: string) {
    return await prisma.achSettlement.findUnique({
      where: { id: settlementId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all settlements for a user
   */
  static async getSettlementsByUser(userId: string, options?: {
    status?: AchSettlementStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };
    if (options?.status) {
      where.status = options.status;
    }

    return await prisma.achSettlement.findMany({
      where,
      include: {
        transactions: {
          select: {
            id: true,
            status: true,
            amount: true,
            transactionType: true,
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get settlement statistics for dashboard
   */
  static async getSettlementStats(userId: string) {
    const [totalSettlements, completedSettlements, pendingSettlements, failedSettlements] = await Promise.all([
      prisma.achSettlement.count({ where: { userId } }),
      prisma.achSettlement.count({ where: { userId, status: AchSettlementStatus.COMPLETED } }),
      prisma.achSettlement.count({ where: { userId, status: { in: [AchSettlementStatus.PENDING, AchSettlementStatus.PROCESSING] } } }),
      prisma.achSettlement.count({ where: { userId, status: AchSettlementStatus.FAILED } }),
    ]);

    const totalAmountResult = await prisma.achSettlement.aggregate({
      where: { userId, status: AchSettlementStatus.COMPLETED },
      _sum: { netAmount: true },
    });

    const totalProcessedAmount = totalAmountResult._sum.netAmount || 0;

    return {
      totalSettlements,
      completedSettlements,
      pendingSettlements,
      failedSettlements,
      totalProcessedAmount,
    };
  }

  /**
   * Cancel a pending settlement
   */
  static async cancelSettlement(settlementId: string) {
    const settlement = await prisma.achSettlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    if (settlement.status !== AchSettlementStatus.PENDING) {
      throw new Error(`Cannot cancel settlement with status: ${settlement.status}`);
    }

    return await prisma.achSettlement.update({
      where: { id: settlementId },
      data: {
        status: AchSettlementStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Generate demo settlements for testing
   */
  static async generateDemoSettlements(userId: string, count: number = 5) {
    const demoSettlements = [];

    for (let i = 0; i < count; i++) {
      const transactionCount = Math.floor(Math.random() * 20) + 5;
      const totalAmount = Math.floor(Math.random() * 50000) + 10000; // $100 - $500

      const settlement = await this.createSettlement({
        userId,
        settlementDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        totalAmount,
        transactionCount,
        bankName: ['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank'][Math.floor(Math.random() * 4)],
        accountLast4: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        routingNumber: `0${Math.floor(Math.random() * 100000000)}`,
        notes: `Demo settlement batch ${i + 1}`,
      });

      // Add demo transactions
      for (let j = 0; j < Math.min(transactionCount, 10); j++) {
        await this.addTransaction({
          settlementId: settlement.id,
          transactionType: Math.random() > 0.2 ? AchTransactionType.CREDIT : AchTransactionType.DEBIT,
          amount: Math.floor(totalAmount / transactionCount),
          recipientName: `Customer ${j + 1}`,
          recipientEmail: `customer${j + 1}@example.com`,
          recipientAccount: `****${Math.floor(Math.random() * 10000)}`,
          description: `Payment for order #${Math.floor(Math.random() * 100000)}`,
        });
      }

      demoSettlements.push(settlement);
    }

    return demoSettlements;
  }
}
