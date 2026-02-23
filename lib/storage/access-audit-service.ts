/**
 * Document Access Audit Service (Law 25 requirement)
 * Logs all document access for compliance
 */

import { getCrmDb } from '@/lib/dal'
import { createDalContext } from '@/lib/context/industry-context';
import { DocumentAccessAction } from '@prisma/client';
const db = getCrmDb({ userId: '', industry: null })

export class AccessAuditService {
  /**
   * Log document access
   */
  async logAccess(
    documentId: string,
    userId: string,
    action: DocumentAccessAction,
    reason: string,
    request?: Request
  ) {
    const ipAddress = request?.headers.get('x-forwarded-for') || 
                     request?.headers.get('x-real-ip') || 
                     undefined;
    const userAgent = request?.headers.get('user-agent') || undefined;
    
    return db.documentAccessLog.create({
      data: {
        documentId,
        userId,
        action,
        reason,
        ipAddress,
        userAgent,
        success: true,
      },
    });
  }
  
  /**
   * Log failed access attempt
   */
  async logFailedAccess(
    documentId: string,
    userId: string,
    action: DocumentAccessAction,
    reason: string,
    errorMessage: string,
    request?: Request
  ) {
    const ipAddress = request?.headers.get('x-forwarded-for') || 
                     request?.headers.get('x-real-ip') || 
                     undefined;
    const userAgent = request?.headers.get('user-agent') || undefined;
    
    return db.documentAccessLog.create({
      data: {
        documentId,
        userId,
        action,
        reason,
        ipAddress,
        userAgent,
        success: false,
        errorMessage,
      },
    });
  }
  
  /**
   * Get access history for a document
   */
  async getAccessHistory(documentId: string) {
    return db.documentAccessLog.findMany({
      where: { documentId },
      include: { 
        user: { 
          select: { 
            name: true, 
            email: true 
          } 
        } 
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  /**
   * Get access history for a patient
   */
  async getPatientAccessHistory(leadId: string) {
    const documents = await db.patientDocument.findMany({
      where: { leadId, deletedAt: null },
      select: { id: true },
    });
    
    if (documents.length === 0) {
      return [];
    }
    
    return db.documentAccessLog.findMany({
      where: {
        documentId: { in: documents.map(d => d.id) },
      },
      include: {
        document: { 
          select: { 
            fileName: true, 
            documentType: true 
          } 
        },
        user: { 
          select: { 
            name: true, 
            email: true 
          } 
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  /**
   * Get recent access for user
   */
  async getRecentAccessForUser(userId: string, limit: number = 50) {
    return db.documentAccessLog.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            fileName: true,
            documentType: true,
            lead: {
              select: {
                contactPerson: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
