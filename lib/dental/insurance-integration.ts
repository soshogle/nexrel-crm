/**
 * Insurance Integration Service
 * Phase 6: RAMQ and private insurance API integration
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';

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
  async checkEligibility(
    patientId: string,
    insuranceNumber: string,
    userId: string,
    industry?: string | null
  ): Promise<InsuranceEligibility> {
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);

    // In production, this would call RAMQ API
    // For now, return mock data
    const lead = await db.lead.findFirst({
      where: { id: patientId, userId },
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
  async submitClaim(
    claim: Omit<InsuranceClaim, 'id' | 'submittedDate' | 'status'>,
    userId: string,
    industry?: string | null
  ): Promise<InsuranceClaim> {
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);

    // In production, this would submit to RAMQ API
    // For now, create a claim record
    const claimNumber = `RAMQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    // Fetch patient info
    const lead = await db.lead.findFirst({
      where: { id: claim.patientId, userId },
      select: { businessName: true, contactPerson: true, email: true, phone: true, dateOfBirth: true },
    });

    const claimRecord = await db.dentalInsuranceClaim.create({
      data: {
        leadId: claim.patientId,
        userId,
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
  async checkClaimStatus(
    claimId: string,
    userId: string,
    industry?: string | null
  ): Promise<InsuranceClaim> {
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);

    const claim = await db.dentalInsuranceClaim.findFirst({
      where: { id: claimId, userId },
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
    providerConfig: InsuranceProvider,
    userId: string,
    industry?: string | null
  ): Promise<InsuranceEligibility> {
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);

    // In production, this would call the provider's API
    const lead = await db.lead.findFirst({
      where: { id: patientId, userId },
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
    providerConfig: InsuranceProvider,
    userId: string,
    industry?: string | null
  ): Promise<InsuranceClaim> {
    const ctx = createDalContext(userId, industry);
    const db = getCrmDb(ctx);

    // In production, this would submit to provider's API
    const claimNumber = `${providerConfig.name}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Fetch patient info
    const lead = await db.lead.findFirst({
      where: { id: claim.patientId, userId },
      select: { businessName: true, contactPerson: true, email: true, phone: true, dateOfBirth: true },
    });

    const claimRecord = await db.dentalInsuranceClaim.create({
      data: {
        leadId: claim.patientId,
        userId,
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
    provider: InsuranceProvider,
    userId: string,
    industry?: string | null
  ): Promise<InsuranceEligibility> {
    if (provider.type === 'RAMQ') {
      const ctx = createDalContext(userId, industry);
      const db = getCrmDb(ctx);
      const insuranceInfo = await db.lead.findFirst({
        where: { id: patientId, userId },
        select: { insuranceInfo: true },
      });
      const info = insuranceInfo?.insuranceInfo as any;
      return this.ramqService.checkEligibility(patientId, info?.policyNumber || '', userId, industry);
    } else {
      return this.privateService.checkEligibility(patientId, provider, userId, industry);
    }
  }

  /**
   * Submit claim to any insurance provider
   */
  async submitClaim(
    claim: Omit<InsuranceClaim, 'id' | 'submittedDate' | 'status'>,
    provider: InsuranceProvider,
    userId: string,
    industry?: string | null
  ): Promise<InsuranceClaim> {
    if (provider.type === 'RAMQ') {
      return this.ramqService.submitClaim(claim, userId, industry);
    } else {
      return this.privateService.submitClaim(claim, provider, userId, industry);
    }
  }
}

export const insuranceManager = new InsuranceManager();
