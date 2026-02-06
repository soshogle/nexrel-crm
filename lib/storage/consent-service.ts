/**
 * Law 25 Consent Management Service
 * Manages patient consent for document collection/processing
 */

import { prisma } from '@/lib/db';
import { ConsentType } from '@prisma/client';

export class ConsentService {
  /**
   * Create consent record
   */
  async createConsent(
    leadId: string,
    userId: string,
    consentType: ConsentType,
    purpose: string,
    legalBasis: string,
    consentMethod: string,
    grantedBy?: string,
    consentExpiry?: Date
  ) {
    return prisma.documentConsent.create({
      data: {
        leadId,
        userId,
        consentType,
        purpose,
        legalBasis,
        consentMethod,
        granted: true,
        grantedAt: new Date(),
        grantedBy: grantedBy || undefined,
        consentExpiry: consentExpiry || null,
      },
    });
  }
  
  /**
   * Check if consent exists and is valid
   */
  async hasValidConsent(
    leadId: string,
    userId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    const consent = await prisma.documentConsent.findFirst({
      where: {
        leadId,
        userId,
        consentType,
        granted: true,
        withdrawn: false,
        OR: [
          { consentExpiry: null },
          { consentExpiry: { gt: new Date() } },
        ],
      },
    });
    
    return !!consent;
  }
  
  /**
   * Get active consent for patient
   */
  async getActiveConsents(leadId: string, userId: string) {
    return prisma.documentConsent.findMany({
      where: {
        leadId,
        userId,
        granted: true,
        withdrawn: false,
        OR: [
          { consentExpiry: null },
          { consentExpiry: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  /**
   * Withdraw consent (Law 25: right to withdraw)
   */
  async withdrawConsent(
    consentId: string,
    reason: string
  ) {
    return prisma.documentConsent.update({
      where: { id: consentId },
      data: {
        withdrawn: true,
        withdrawnAt: new Date(),
        withdrawalReason: reason,
      },
    });
  }
  
  /**
   * Get consent by ID
   */
  async getConsent(consentId: string) {
    return prisma.documentConsent.findUnique({
      where: { id: consentId },
      include: {
        lead: {
          select: {
            id: true,
            contactPerson: true,
            email: true,
          },
        },
      },
    });
  }
}
