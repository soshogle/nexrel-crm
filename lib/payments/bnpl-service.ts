
/**
 * BNPL (Buy Now, Pay Later) Service (Demo Mode)
 * Handles BNPL financing applications, payment schedules, and installment tracking
 * Integrates with AI Trust Score for credit decisioning
 */

import { prisma } from '@/lib/db';
import { BnplStatus, BnplInstallmentStatus, RiskLevel } from '@prisma/client';

export interface CreateBnplApplicationParams {
  userId: string;
  purchaseAmount: number; // in cents
  downPayment?: number; // in cents
  installmentCount: number; // 4, 6, 12, etc.
  interestRate?: number; // APR percentage
  merchantName?: string;
  merchantId?: string;
  productDescription?: string;
  orderId?: string;
}

export interface BnplApprovalResult {
  approved: boolean;
  applicationId: string;
  creditScore?: number;
  riskLevel: RiskLevel;
  denialReason?: string;
  terms?: {
    installmentAmount: number;
    totalRepayment: number;
    firstPaymentDate: Date;
    lastPaymentDate: Date;
  };
}

export interface ProcessInstallmentParams {
  installmentId: string;
  paymentMethod?: string;
  transactionId?: string;
}

export class BnplService {
  /**
   * Create a BNPL application
   */
  static async createApplication(params: CreateBnplApplicationParams) {
    const downPayment = params.downPayment || 0;
    const financedAmount = params.purchaseAmount - downPayment;
    const interestRate = params.interestRate || 0;
    
    // Calculate interest and total repayment
    const totalInterest = Math.floor(financedAmount * (interestRate / 100) * (params.installmentCount / 12));
    const totalRepayment = financedAmount + totalInterest;
    const installmentAmount = Math.ceil(totalRepayment / params.installmentCount);

    const application = await prisma.bnplApplication.create({
      data: {
        userId: params.userId,
        purchaseAmount: params.purchaseAmount,
        downPayment,
        financedAmount,
        installmentCount: params.installmentCount,
        installmentAmount,
        interestRate,
        totalInterest,
        totalRepayment,
        remainingBalance: totalRepayment,
        merchantName: params.merchantName,
        merchantId: params.merchantId,
        productDescription: params.productDescription,
        orderId: params.orderId,
      },
    });

    return application;
  }

  /**
   * Process BNPL application with AI Trust Score credit check
   */
  static async processApplication(applicationId: string): Promise<BnplApprovalResult> {
    const application = await prisma.bnplApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Get AI Trust Score from the AI service or database
    let creditScore: number | undefined;
    let riskLevel: RiskLevel = RiskLevel.MEDIUM;

    try {
      // Try to get credit score from database
      const existingScore = await prisma.creditScore.findUnique({
        where: { userId: application.userId },
      });

      if (existingScore) {
        creditScore = existingScore.score;
        riskLevel = existingScore.riskLevel;
      } else {
        // Simulate AI Trust Score call (in production, this would call the Python service on port 8000)
        creditScore = Math.floor(Math.random() * 250) + 600; // 600-850
        riskLevel = creditScore >= 750 ? RiskLevel.LOW 
                  : creditScore >= 650 ? RiskLevel.MEDIUM 
                  : creditScore >= 550 ? RiskLevel.HIGH 
                  : RiskLevel.CRITICAL;
      }
    } catch (error) {
      console.error('Error fetching credit score:', error);
      // Default to medium risk if we can't get the score
      creditScore = 650;
      riskLevel = RiskLevel.MEDIUM;
    }

    // Approval logic based on risk level and purchase amount
    const maxFinancingByRisk = {
      [RiskLevel.LOW]: 500000, // $5,000
      [RiskLevel.MEDIUM]: 250000, // $2,500
      [RiskLevel.HIGH]: 100000, // $1,000
      [RiskLevel.CRITICAL]: 0, // Not approved
    };

    const maxAllowed = maxFinancingByRisk[riskLevel];
    const approved = application.financedAmount <= maxAllowed;

    let denialReason: string | undefined;
    if (!approved) {
      if (riskLevel === RiskLevel.CRITICAL) {
        denialReason = 'Credit score too low for BNPL financing';
      } else {
        denialReason = `Purchase amount exceeds maximum for risk level. Maximum allowed: $${(maxAllowed / 100).toFixed(2)}`;
      }
    }

    // Update application
    const updatedApplication = await prisma.bnplApplication.update({
      where: { id: applicationId },
      data: {
        status: approved ? BnplStatus.APPROVED : BnplStatus.CANCELLED,
        creditCheckScore: creditScore,
        riskLevel,
        creditCheckDate: new Date(),
        approvedAt: approved ? new Date() : null,
        denialReason,
      },
    });

    if (approved) {
      // Create installment schedule
      await this.createInstallmentSchedule(applicationId);
      
      const firstInstallment = await prisma.bnplInstallment.findFirst({
        where: { bnplApplicationId: applicationId },
        orderBy: { installmentNumber: 'asc' },
      });

      const lastInstallment = await prisma.bnplInstallment.findFirst({
        where: { bnplApplicationId: applicationId },
        orderBy: { installmentNumber: 'desc' },
      });

      // Update application with payment dates
      await prisma.bnplApplication.update({
        where: { id: applicationId },
        data: {
          firstPaymentDate: firstInstallment?.dueDate,
          lastPaymentDate: lastInstallment?.dueDate,
          nextPaymentDate: firstInstallment?.dueDate,
          status: BnplStatus.ACTIVE,
        },
      });

      return {
        approved: true,
        applicationId,
        creditScore,
        riskLevel,
        terms: {
          installmentAmount: application.installmentAmount,
          totalRepayment: application.totalRepayment,
          firstPaymentDate: firstInstallment!.dueDate,
          lastPaymentDate: lastInstallment!.dueDate,
        },
      };
    } else {
      return {
        approved: false,
        applicationId,
        creditScore,
        riskLevel,
        denialReason,
      };
    }
  }

  /**
   * Create installment schedule
   */
  private static async createInstallmentSchedule(applicationId: string) {
    const application = await prisma.bnplApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const installments = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14); // First payment in 14 days

    for (let i = 1; i <= application.installmentCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (i - 1) * 14); // Every 2 weeks

      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3-day grace period

      const overdueDate = new Date(gracePeriodEnd);
      overdueDate.setDate(overdueDate.getDate() + 1);

      installments.push({
        bnplApplicationId: applicationId,
        installmentNumber: i,
        dueDate,
        amount: application.installmentAmount,
        gracePeriodEnd,
        overdueDate,
      });
    }

    await prisma.bnplInstallment.createMany({
      data: installments,
    });
  }

  /**
   * Process installment payment
   */
  static async processInstallmentPayment(params: ProcessInstallmentParams) {
    const installment = await prisma.bnplInstallment.findUnique({
      where: { id: params.installmentId },
      include: { bnplApplication: true },
    });

    if (!installment) {
      throw new Error('Installment not found');
    }

    if (installment.status === BnplInstallmentStatus.PAID) {
      throw new Error('Installment already paid');
    }

    // Update installment
    const updatedInstallment = await prisma.bnplInstallment.update({
      where: { id: params.installmentId },
      data: {
        status: BnplInstallmentStatus.PAID,
        paidAmount: installment.amount,
        paidDate: new Date(),
        paymentMethod: params.paymentMethod,
        transactionId: params.transactionId,
      },
    });

    // Update application
    const newRemainingBalance = installment.bnplApplication.remainingBalance - installment.amount;
    const newTotalPaid = installment.bnplApplication.totalPaid + installment.amount;
    const newPaidInstallments = installment.bnplApplication.paidInstallments + 1;

    const isCompleted = newPaidInstallments === installment.bnplApplication.installmentCount;

    await prisma.bnplApplication.update({
      where: { id: installment.bnplApplicationId },
      data: {
        remainingBalance: newRemainingBalance,
        totalPaid: newTotalPaid,
        paidInstallments: newPaidInstallments,
        status: isCompleted ? BnplStatus.COMPLETED : BnplStatus.ACTIVE,
        completedAt: isCompleted ? new Date() : null,
        nextPaymentDate: isCompleted ? null : (await this.getNextUnpaidInstallment(installment.bnplApplicationId))?.dueDate,
      },
    });

    return updatedInstallment;
  }

  /**
   * Get next unpaid installment
   */
  private static async getNextUnpaidInstallment(applicationId: string) {
    return await prisma.bnplInstallment.findFirst({
      where: {
        bnplApplicationId: applicationId,
        status: { in: [BnplInstallmentStatus.SCHEDULED, BnplInstallmentStatus.PENDING] },
      },
      orderBy: { installmentNumber: 'asc' },
    });
  }

  /**
   * Get BNPL application with installments
   */
  static async getApplication(applicationId: string) {
    return await prisma.bnplApplication.findUnique({
      where: { id: applicationId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
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
   * Get all applications for a user
   */
  static async getApplicationsByUser(userId: string, options?: {
    status?: BnplStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };
    if (options?.status) {
      where.status = options.status;
    }

    return await prisma.bnplApplication.findMany({
      where,
      include: {
        installments: {
          select: {
            id: true,
            installmentNumber: true,
            status: true,
            dueDate: true,
            amount: true,
          },
        },
        _count: {
          select: { installments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get BNPL statistics for dashboard
   */
  static async getBnplStats(userId: string) {
    const [totalApplications, activeApplications, completedApplications, defaultedApplications] = await Promise.all([
      prisma.bnplApplication.count({ where: { userId } }),
      prisma.bnplApplication.count({ where: { userId, status: BnplStatus.ACTIVE } }),
      prisma.bnplApplication.count({ where: { userId, status: BnplStatus.COMPLETED } }),
      prisma.bnplApplication.count({ where: { userId, status: BnplStatus.DEFAULTED } }),
    ]);

    const totalFinancedResult = await prisma.bnplApplication.aggregate({
      where: { userId, status: { in: [BnplStatus.ACTIVE, BnplStatus.COMPLETED] } },
      _sum: { financedAmount: true },
    });

    const totalPaidResult = await prisma.bnplApplication.aggregate({
      where: { userId },
      _sum: { totalPaid: true },
    });

    const remainingBalanceResult = await prisma.bnplApplication.aggregate({
      where: { userId, status: BnplStatus.ACTIVE },
      _sum: { remainingBalance: true },
    });

    return {
      totalApplications,
      activeApplications,
      completedApplications,
      defaultedApplications,
      totalFinanced: totalFinancedResult._sum.financedAmount || 0,
      totalPaid: totalPaidResult._sum.totalPaid || 0,
      remainingBalance: remainingBalanceResult._sum.remainingBalance || 0,
    };
  }

  /**
   * Mark overdue installments
   */
  static async markOverdueInstallments() {
    const now = new Date();

    const overdueInstallments = await prisma.bnplInstallment.findMany({
      where: {
        status: { in: [BnplInstallmentStatus.SCHEDULED, BnplInstallmentStatus.PENDING] },
        overdueDate: { lte: now },
      },
    });

    for (const installment of overdueInstallments) {
      await prisma.bnplInstallment.update({
        where: { id: installment.id },
        data: {
          status: BnplInstallmentStatus.OVERDUE,
          lateFee: 2500, // $25 late fee
        },
      });

      // Update application
      await prisma.bnplApplication.update({
        where: { id: installment.bnplApplicationId },
        data: {
          missedPayments: { increment: 1 },
          totalLateFees: { increment: 2500 },
        },
      });
    }

    return overdueInstallments.length;
  }

  /**
   * Calculate BNPL eligibility for a user
   */
  static async calculateEligibility(userId: string, purchaseAmount: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { creditScore: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let creditScore = 650; // Default
    let riskLevel: RiskLevel = RiskLevel.MEDIUM;

    if (user.creditScore) {
      creditScore = user.creditScore.score;
      riskLevel = user.creditScore.riskLevel;
    }

    const maxFinancingByRisk = {
      [RiskLevel.LOW]: 500000, // $5,000
      [RiskLevel.MEDIUM]: 250000, // $2,500
      [RiskLevel.HIGH]: 100000, // $1,000
      [RiskLevel.CRITICAL]: 0, // Not eligible
    };

    const maxAllowed = maxFinancingByRisk[riskLevel];
    const eligible = purchaseAmount <= maxAllowed;

    return {
      eligible,
      creditScore,
      riskLevel,
      maxAllowed,
      purchaseAmount,
      message: eligible 
        ? `Eligible for BNPL financing up to $${(maxAllowed / 100).toFixed(2)}`
        : `Not eligible. Maximum allowed: $${(maxAllowed / 100).toFixed(2)}`,
    };
  }

  /**
   * Generate demo BNPL applications for testing
   */
  static async generateDemoApplications(userId: string, count: number = 3) {
    const demoApplications = [];
    const products = [
      { name: 'Laptop Pro 16"', amount: 249900 },
      { name: 'Smartphone X Max', amount: 119900 },
      { name: 'Wireless Headphones', amount: 34900 },
      { name: 'Smart Watch Series 5', amount: 39900 },
      { name: 'Tablet Air 11"', amount: 79900 },
    ];

    for (let i = 0; i < count; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const installmentCount = [4, 6, 12][Math.floor(Math.random() * 3)];

      const application = await this.createApplication({
        userId,
        purchaseAmount: product.amount,
        downPayment: Math.floor(product.amount * 0.1), // 10% down payment
        installmentCount,
        interestRate: installmentCount === 4 ? 0 : installmentCount === 6 ? 5 : 12,
        merchantName: 'Demo Electronics Store',
        merchantId: `MERCH-${Math.floor(Math.random() * 10000)}`,
        productDescription: product.name,
        orderId: `ORD-${Date.now()}-${i}`,
      });

      // Auto-approve some applications
      if (Math.random() > 0.3) {
        await this.processApplication(application.id);
      }

      demoApplications.push(application);
    }

    return demoApplications;
  }
}
