/**
 * Dental Workflow Triggers
 * Phase 3: Listen for dental-specific events and trigger workflows
 */

import { WorkflowEngine } from '@/lib/workflow-engine';
import { prisma } from '@/lib/db';

const workflowEngine = new WorkflowEngine();

/**
 * Trigger workflow when X-ray is uploaded
 */
export async function triggerXrayUploadedWorkflow(
  xrayId: string,
  leadId: string,
  userId: string,
  xrayType: string
) {
  try {
    const xray = await (prisma as any).dentalXRay.findUnique({
      where: { id: xrayId },
      include: { lead: true },
    });

    if (!xray) return;

    await workflowEngine.triggerWorkflow(
      'DENTAL_XRAY_UPLOADED',
      {
        userId,
        leadId,
        dealId: null,
        variables: {
          xrayId,
          xrayType,
          patientName: xray.lead?.businessName || xray.lead?.contactPerson || 'Unknown',
        },
      },
      {
        xrayId,
        xrayType,
        leadId,
      }
    );
  } catch (error) {
    console.error('Error triggering X-ray uploaded workflow:', error);
  }
}

/**
 * Trigger workflow when appointment is scheduled
 */
export async function triggerAppointmentScheduledWorkflow(
  appointmentId: string,
  leadId: string,
  userId: string,
  appointmentDate: Date
) {
  try {
    const appointment = await prisma.bookingAppointment.findUnique({
      where: { id: appointmentId },
      include: { lead: true },
    });

    if (!appointment) return;

    await workflowEngine.triggerWorkflow(
      'DENTAL_APPOINTMENT_SCHEDULED',
      {
        userId,
        leadId,
        dealId: null,
        variables: {
          appointmentId,
          appointmentDate: appointmentDate.toISOString(),
          patientName: appointment.lead?.businessName || appointment.lead?.contactPerson || 'Unknown',
        },
      },
      {
        appointmentId,
        appointmentDate,
        leadId,
      }
    );
  } catch (error) {
    console.error('Error triggering appointment scheduled workflow:', error);
  }
}

/**
 * Trigger workflow when treatment plan is created
 */
export async function triggerTreatmentPlanCreatedWorkflow(
  treatmentPlanId: string,
  leadId: string,
  userId: string
) {
  try {
    const treatmentPlan = await (prisma as any).dentalTreatmentPlan.findUnique({
      where: { id: treatmentPlanId },
      include: { lead: true },
    });

    if (!treatmentPlan) return;

    await workflowEngine.triggerWorkflow(
      'DENTAL_TREATMENT_PLAN_CREATED',
      {
        userId,
        leadId,
        dealId: null,
        variables: {
          treatmentPlanId,
          status: treatmentPlan.status,
          patientName: treatmentPlan.lead?.businessName || treatmentPlan.lead?.contactPerson || 'Unknown',
        },
      },
      {
        treatmentPlanId,
        leadId,
      }
    );
  } catch (error) {
    console.error('Error triggering treatment plan created workflow:', error);
  }
}

/**
 * Trigger workflow when treatment plan is approved
 */
export async function triggerTreatmentPlanApprovedWorkflow(
  treatmentPlanId: string,
  leadId: string,
  userId: string
) {
  try {
    await workflowEngine.triggerWorkflow(
      'DENTAL_TREATMENT_PLAN_APPROVED',
      {
        userId,
        leadId,
        dealId: null,
        variables: {
          treatmentPlanId,
        },
      },
      {
        treatmentPlanId,
        leadId,
      }
    );
  } catch (error) {
    console.error('Error triggering treatment plan approved workflow:', error);
  }
}

/**
 * Trigger workflow when procedure is completed
 */
export async function triggerProcedureCompletedWorkflow(
  procedureId: string,
  leadId: string,
  userId: string
) {
  try {
    const procedure = await (prisma as any).dentalProcedure.findUnique({
      where: { id: procedureId },
      include: { lead: true },
    });

    if (!procedure) return;

    await workflowEngine.triggerWorkflow(
      'DENTAL_PROCEDURE_COMPLETED',
      {
        userId,
        leadId,
        dealId: null,
        variables: {
          procedureId,
          procedureType: procedure.procedureType,
          patientName: procedure.lead?.businessName || procedure.lead?.contactPerson || 'Unknown',
        },
      },
      {
        procedureId,
        leadId,
      }
    );
  } catch (error) {
    console.error('Error triggering procedure completed workflow:', error);
  }
}

/**
 * Trigger workflow when patient checks in
 */
export async function triggerPatientCheckedInWorkflow(
  appointmentId: string,
  leadId: string,
  userId: string
) {
  try {
    await workflowEngine.triggerWorkflow(
      'DENTAL_PATIENT_CHECKED_IN',
      {
        userId,
        leadId,
        dealId: null,
        variables: {
          appointmentId,
        },
      },
      {
        appointmentId,
        leadId,
      }
    );
  } catch (error) {
    console.error('Error triggering patient checked in workflow:', error);
  }
}

/**
 * Trigger workflow when insurance claim is submitted
 */
export async function triggerInsuranceClaimSubmittedWorkflow(
  claimId: string,
  leadId: string,
  userId: string
) {
  try {
    await workflowEngine.triggerWorkflow(
      'DENTAL_INSURANCE_CLAIM_SUBMITTED',
      {
        userId,
        leadId,
        dealId: null,
        variables: {
          claimId,
        },
      },
      {
        claimId,
        leadId,
      }
    );
  } catch (error) {
    console.error('Error triggering insurance claim submitted workflow:', error);
  }
}
