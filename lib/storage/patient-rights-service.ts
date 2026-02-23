/**
 * Patient Rights Service (Law 25 requirements)
 * Handles access requests, deletion requests, data portability
 */

import { getCrmDb } from '@/lib/dal'
import { createDalContext } from '@/lib/context/industry-context';
import { CanadianStorageService } from './canadian-storage-service';
import { DataRequestType, DataRequestStatus } from '@prisma/client';
const db = getCrmDb({ userId: '', industry: null })

export class PatientRightsService {
  private storageService = new CanadianStorageService();
  
  /**
   * Create data access request (Law 25: right to access)
   */
  async requestAccess(
    leadId: string,
    userId: string,
    requestedBy: string,
    reason?: string
  ) {
    return db.dataAccessRequest.create({
      data: {
        leadId,
        userId,
        requestType: 'ACCESS',
        requestedBy,
        requestReason: reason,
        status: 'PENDING',
      },
    });
  }
  
  /**
   * Process access request - export all patient data
   */
  async processAccessRequest(requestId: string) {
    const request = await db.dataAccessRequest.findUnique({
      where: { id: requestId },
      include: { lead: true },
    });
    
    if (!request) throw new Error('Request not found');
    
    // Get all documents for patient
    const documents = await db.patientDocument.findMany({
      where: {
        leadId: request.leadId,
        deletedAt: null,
      },
    });
    
    // Get dental records
    const odontograms = await db.dentalOdontogram.findMany({
      where: { leadId: request.leadId },
    });
    
    const periodontalCharts = await db.dentalPeriodontalChart.findMany({
      where: { leadId: request.leadId },
    });
    
    const treatmentPlans = await db.dentalTreatmentPlan.findMany({
      where: { leadId: request.leadId },
    });
    
    const procedures = await db.dentalProcedure.findMany({
      where: { leadId: request.leadId },
    });
    
    const formResponses = await db.dentalFormResponse.findMany({
      where: { leadId: request.leadId },
    });
    
    // Export data (create downloadable package)
    const exportData = {
      patientInfo: {
        name: request.lead.contactPerson,
        email: request.lead.email,
        phone: request.lead.phone,
        dateOfBirth: request.lead.dateOfBirth,
        dentalHistory: request.lead.dentalHistory,
        insuranceInfo: request.lead.insuranceInfo,
      },
      documents: documents.map(doc => ({
        fileName: doc.fileName,
        documentType: doc.documentType,
        category: doc.category,
        uploadedAt: doc.createdAt,
        description: doc.description,
      })),
      odontograms: odontograms.map(chart => ({
        chartDate: chart.chartDate,
        notes: chart.notes,
        toothData: chart.toothData,
      })),
      periodontalCharts: periodontalCharts.map(chart => ({
        chartDate: chart.chartDate,
        measurements: chart.measurements,
        notes: chart.notes,
      })),
      treatmentPlans: treatmentPlans.map(plan => ({
        planName: plan.planName,
        status: plan.status,
        totalCost: plan.totalCost,
        createdDate: plan.createdDate,
        procedures: plan.procedures,
      })),
      procedures: procedures.map(proc => ({
        procedureCode: proc.procedureCode,
        procedureName: proc.procedureName,
        status: proc.status,
        performedDate: proc.performedDate,
        cost: proc.cost,
      })),
      formResponses: formResponses.map(response => ({
        submittedAt: response.submittedAt,
        responseData: response.responseData,
      })),
      requestDate: request.requestedAt,
      exportDate: new Date().toISOString(),
    };
    
    // Update request status
    await db.dataAccessRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        responseData: exportData as any,
        responseMethod: 'PORTAL',
      },
    });
    
    return exportData;
  }
  
  /**
   * Request data deletion (Law 25: right to deletion)
   */
  async requestDeletion(
    leadId: string,
    userId: string,
    requestedBy: string,
    reason: string
  ) {
    // Check for legal holds
    const documents = await db.patientDocument.findMany({
      where: { leadId, deletionBlocked: false },
    });
    
    // Mark for deletion
    await db.patientDocument.updateMany({
      where: { leadId, deletionBlocked: false },
      data: {
        deletionRequested: true,
        deletionRequestDate: new Date(),
        deletionReason: reason,
      },
    });
    
    // Create deletion request record
    return db.dataAccessRequest.create({
      data: {
        leadId,
        userId,
        requestType: 'DELETION',
        requestedBy,
        requestReason: reason,
        status: 'PENDING',
      },
    });
  }
  
  /**
   * Process deletion requests (respecting retention policies)
   */
  async processDeletionRequests() {
    const requests = await db.dataAccessRequest.findMany({
      where: {
        requestType: 'DELETION',
        status: 'PENDING',
      },
      include: { lead: true },
    });
    
    for (const request of requests) {
      const documents = await db.patientDocument.findMany({
        where: {
          leadId: request.leadId,
          deletionRequested: true,
          deletionBlocked: false,
          retentionExpiry: { lte: new Date() }, // Only delete if retention expired
        },
      });
      
      let deletedCount = 0;
      for (const doc of documents) {
        try {
          // Delete from storage
          await this.storageService.deleteDocument(doc.encryptedStoragePath);
          
          // Soft delete in database
          await db.patientDocument.update({
            where: { id: doc.id },
            data: { deletedAt: new Date() },
          });
          
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete document ${doc.id}:`, error);
        }
      }
      
      // Update request status
      await db.dataAccessRequest.update({
        where: { id: request.id },
        data: {
          status: deletedCount > 0 ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: deletedCount > 0 ? new Date() : null,
          notes: `Deleted ${deletedCount} documents. ${documents.length - deletedCount} documents still under retention period.`,
        },
      });
    }
  }
  
  /**
   * Get all requests for a patient
   */
  async getPatientRequests(leadId: string) {
    return db.dataAccessRequest.findMany({
      where: { leadId },
      orderBy: { requestedAt: 'desc' },
    });
  }
  
  /**
   * Get request by ID
   */
  async getRequest(requestId: string) {
    return db.dataAccessRequest.findUnique({
      where: { id: requestId },
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
