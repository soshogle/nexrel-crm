/**
 * Insurance Integration Service
 * Phase 6: RAMQ and private insurance API integration
 */

import { prisma } from '@/lib/db';

export interface InsuranceProvider {
  id: string;
  name: string;
  type: 'RAMQ' | 'PRIVATE';
  apiEndpoint?: string;
  apiKey?: string;
  credentials?: any;
}

export interface InsuranceClaim {
  id: string;
  patientId: string;
  provider: InsuranceProvider;
  procedureCode: string;
  procedureName: string;
  amount: number;
  submittedDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  claimNumber?: string;
  response?: any;
}

export interface InsuranceEligibility {
  eligible: boolean;
  coverage: number; // Percentage
  annualMaximum?: number;
  remainingMaximum?: number;
  deductible?: number;
  waitingPeriod?: number;
  restrictions?: string[];
}

/**
 * RAMQ Insurance Integration
 */
export class RAMQInsuranceService {
  /**
   * Check patient eligibility with RAMQ
   */
  async checkEligibility(patientId: string, insuranceNumber: string): Promise<InsuranceEligibility> {
    // In production, this would call RAMQ API
    // For now, return mock data
    const lead = await prisma.lead.findUnique({
      where: { id: patientId },
      select: { insuranceInfo: true },
    });

    const insuranceInfo = lead?.insuranceInfo as any;
    if (!insuranceInfo || insuranceInfo.provider !== 'RAMQ') {
      return {
        eligible: false,
        coverage: 0,
      };
    }

    // Mock RAMQ eligibility check
    return {
      eligible: true,
      coverage: 0.8, // 80% coverage for basic services
      annualMaximum: 1000,
      remainingMaximum: 750,
      deductible: 0, // RAMQ typically has no deductible
      restrictions: ['Basic services only', 'Annual maximum applies'],
    };
  }

  /**
   * Submit claim to RAMQ
   */
  async submitClaim(claim: Omit<InsuranceClaim, 'id' | 'submittedDate' | 'status'>): Promise<InsuranceClaim> {
    // In production, this would submit to RAMQ API
    // For now, create a claim record
    const claimNumber = `RAMQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    // Fetch patient info
    const lead = await prisma.lead.findUnique({
      where: { id: claim.patientId },
      select: { businessName: true, contactPerson: true, email: true, phone: true, dateOfBirth: true },
    });

    const claimRecord = await prisma.dentalInsuranceClaim.create({
      data: {
        leadId: claim.patientId,
        userId: '', // Will be set by caller
        claimNumber,
        insuranceType: 'RAMQ',
        providerName: 'RAMQ',
        policyNumber: '',
        patientInfo: {
          name: lead?.businessName || lead?.contactPerson || 'Unknown',
          email: lead?.email || '',
          phone: lead?.phone || '',
          dateOfBirth: lead?.dateOfBirth?.toISOString() || '',
        },
        procedures: [{
          procedureCode: claim.procedureCode,
          description: claim.procedureName,
          cost: claim.amount,
          dateOfService: new Date().toISOString(),
        }],
        totalAmount: claim.amount,
        submittedAmount: claim.amount,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return {
      id: claimRecord.id,
      patientId: claim.patientId,
      provider: claim.provider,
      procedureCode: claim.procedureCode,
      procedureName: claim.procedureName,
      amount: claim.amount,
      submittedDate: new Date(claimRecord.submittedAt || new Date()),
      status: 'PENDING' as const,
    };
  }

  /**
   * Check claim status
   */
  async checkClaimStatus(claimId: string): Promise<InsuranceClaim> {
    const claim = await prisma.dentalInsuranceClaim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new Error('Claim not found');
    }

    // In production, this would query RAMQ API
    // For now, return current status
    const procedures = claim.procedures as any[];
    return {
      id: claim.id,
      patientId: claim.leadId,
      provider: { id: '', name: claim.providerName, type: claim.insuranceType === 'RAMQ' ? 'RAMQ' : 'PRIVATE' },
      procedureCode: procedures?.[0]?.procedureCode || '',
      procedureName: procedures?.[0]?.description || '',
      amount: claim.totalAmount,
      submittedDate: new Date(claim.submittedAt || claim.createdAt),
      status: (claim.status === 'DRAFT' ? 'PENDING' : 
               claim.status === 'APPROVED' ? 'APPROVED' :
               claim.status === 'DENIED' ? 'REJECTED' :
               claim.status === 'PAID' ? 'PAID' : 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID',
      claimNumber: claim.claimNumber || undefined,
    };
  }
}

/**
 * Private Insurance Integration
 */
export class PrivateInsuranceService {
  /**
   * Check patient eligibility with private insurance
   */
  async checkEligibility(
    patientId: string,
    providerConfig: InsuranceProvider
  ): Promise<InsuranceEligibility> {
    // In production, this would call the provider's API
    const lead = await prisma.lead.findUnique({
      where: { id: patientId },
      select: { insuranceInfo: true },
    });

    const insuranceInfo = lead?.insuranceInfo as any;
    if (!insuranceInfo || insuranceInfo.provider !== providerConfig.name) {
      return {
        eligible: false,
        coverage: 0,
      };
    }

    // Mock private insurance eligibility (typically better coverage)
    return {
      eligible: true,
      coverage: 0.9, // 90% coverage
      annualMaximum: 2000,
      remainingMaximum: 1500,
      deductible: 50,
      restrictions: ['Annual maximum applies', 'Deductible applies'],
    };
  }

  /**
   * Submit claim to private insurance
   */
  async submitClaim(
    claim: Omit<InsuranceClaim, 'id' | 'submittedDate' | 'status'>,
    providerConfig: InsuranceProvider
  ): Promise<InsuranceClaim> {
    // In production, this would submit to provider's API
    const claimNumber = `${providerConfig.name}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Fetch patient info
    const lead = await prisma.lead.findUnique({
      where: { id: claim.patientId },
      select: { businessName: true, contactPerson: true, email: true, phone: true, dateOfBirth: true },
    });

    const claimRecord = await prisma.dentalInsuranceClaim.create({
      data: {
        leadId: claim.patientId,
        userId: '', // Will be set by caller
        claimNumber,
        insuranceType: 'PRIVATE',
        providerName: providerConfig.name,
        policyNumber: '',
        patientInfo: {
          name: lead?.businessName || lead?.contactPerson || 'Unknown',
          email: lead?.email || '',
          phone: lead?.phone || '',
          dateOfBirth: lead?.dateOfBirth?.toISOString() || '',
        },
        procedures: [{
          procedureCode: claim.procedureCode,
          description: claim.procedureName,
          cost: claim.amount,
          dateOfService: new Date().toISOString(),
        }],
        totalAmount: claim.amount,
        submittedAmount: claim.amount,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return {
      id: claimRecord.id,
      patientId: claim.patientId,
      provider: providerConfig,
      procedureCode: claim.procedureCode,
      procedureName: claim.procedureName,
      amount: claim.amount,
      submittedDate: new Date(claimRecord.submittedAt || claimRecord.createdAt),
      status: 'PENDING',
    };
  }
}

/**
 * Insurance Manager - Unified interface for all insurance providers
 */
export class InsuranceManager {
  private ramqService: RAMQInsuranceService;
  private privateService: PrivateInsuranceService;

  constructor() {
    this.ramqService = new RAMQInsuranceService();
    this.privateService = new PrivateInsuranceService();
  }

  /**
   * Check eligibility for any insurance provider
   */
  async checkEligibility(
    patientId: string,
    provider: InsuranceProvider
  ): Promise<InsuranceEligibility> {
    if (provider.type === 'RAMQ') {
      const insuranceInfo = await prisma.lead.findUnique({
        where: { id: patientId },
        select: { insuranceInfo: true },
      });
      const info = insuranceInfo?.insuranceInfo as any;
      return this.ramqService.checkEligibility(patientId, info?.policyNumber || '');
    } else {
      return this.privateService.checkEligibility(patientId, provider);
    }
  }

  /**
   * Submit claim to any insurance provider
   */
  async submitClaim(
    claim: Omit<InsuranceClaim, 'id' | 'submittedDate' | 'status'>,
    provider: InsuranceProvider
  ): Promise<InsuranceClaim> {
    if (provider.type === 'RAMQ') {
      const result = await this.ramqService.submitClaim(claim);
      return result;
    } else {
      return await this.privateService.submitClaim(claim, provider);
    }
  }
}

export const insuranceManager = new InsuranceManager();
