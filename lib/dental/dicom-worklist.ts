/**
 * DICOM Modality Worklist (MWL) Service
 * Manages scheduled studies and worklist queries
 */

import { prisma } from '@/lib/db';
import { DicomServerService } from './dicom-server';

export interface WorklistItem {
  id: string;
  patientId: string;
  patientName: string;
  scheduledProcedureStepStartDate: string;
  scheduledProcedureStepStartTime: string;
  modality: string;
  scheduledProcedureStepDescription: string;
  requestedProcedureDescription?: string;
  accessionNumber?: string;
  appointmentId?: string;
}

export class DicomWorklistService {
  /**
   * Query Modality Worklist
   * Returns scheduled studies for a given date range
   */
  static async queryWorklist(
    userId: string,
    startDate: string,
    endDate: string,
    modality?: string
  ): Promise<WorklistItem[]> {
    try {
      // Get appointments from database
      const appointments = await prisma.bookingAppointment.findMany({
        where: {
          userId,
          appointmentDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          lead: true,
        },
      });

      // Convert appointments to worklist items
      const worklistItems: WorklistItem[] = appointments.map((apt) => ({
        id: apt.id,
        patientId: apt.leadId || '',
        patientName: apt.lead?.contactPerson || apt.lead?.businessName || apt.customerName || 'Unknown',
        scheduledProcedureStepStartDate: apt.appointmentDate.toISOString().split('T')[0],
        scheduledProcedureStepStartTime: apt.appointmentDate.toISOString().split('T')[1]?.split('.')[0] || '',
        modality: modality || 'PX', // Default to Panoramic
        scheduledProcedureStepDescription: apt.notes || 'Dental X-Ray',
        appointmentId: apt.id,
      }));

      return worklistItems;
    } catch (error) {
      console.error('[DICOM Worklist] Error querying worklist:', error);
      throw error;
    }
  }

  /**
   * Auto-import X-rays for scheduled appointments
   * Called after X-ray is taken to automatically import if appointment exists
   */
  static async autoImportForAppointment(
    appointmentId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const appointment = await prisma.bookingAppointment.findUnique({
        where: { id: appointmentId, userId },
        include: { lead: true },
      });

      if (!appointment || !appointment.leadId) {
        return false;
      }

      // Query for studies matching this patient and date
      const studyDate = appointment.appointmentDate.toISOString().split('T')[0];
      const studies = await DicomServerService.queryRemoteStudies(
        {
          id: 'default',
          name: 'Default Server',
          aeTitle: process.env.DICOM_AE_TITLE || 'NEXREL-CRM',
          host: process.env.ORTHANC_HOST || 'localhost',
          port: parseInt(process.env.ORTHANC_PORT || '4242'),
          isActive: true,
          userId,
        },
        {
          patientId: appointment.leadId,
          studyDate,
        }
      );

      // Import matching studies
      for (const study of studies) {
        await DicomServerService.importStudy(
          study.studyInstanceUid,
          appointment.leadId,
          userId
        );
      }

      return studies.length > 0;
    } catch (error) {
      console.error('[DICOM Worklist] Error auto-importing:', error);
      return false;
    }
  }

  /**
   * Get worklist for a specific date
   */
  static async getWorklistForDate(
    userId: string,
    date: string
  ): Promise<WorklistItem[]> {
    return this.queryWorklist(userId, date, date);
  }
}
