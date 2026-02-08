/**
 * Dental Role Types and Permissions
 * Defines roles for Clinical (Practitioner) and Administrative (Admin Assistant) dashboards
 */

export type DentalRole = 'practitioner' | 'admin_assistant' | 'practice_owner' | 'hybrid';

export interface DentalRolePermissions {
  // Clinical Features
  canViewXrays: boolean;
  canEditXrays: boolean;
  canViewOdontogram: boolean;
  canEditOdontogram: boolean;
  canViewTreatmentPlans: boolean;
  canEditTreatmentPlans: boolean;
  canViewPeriodontalChart: boolean;
  canEditPeriodontalChart: boolean;
  canLogProcedures: boolean;
  canViewClinicalNotes: boolean;
  canEditClinicalNotes: boolean;
  
  // Administrative Features
  canViewSchedule: boolean;
  canEditSchedule: boolean;
  canViewProduction: boolean;
  canEditProduction: boolean;
  canViewBilling: boolean;
  canEditBilling: boolean;
  canViewInsurance: boolean;
  canEditInsurance: boolean;
  canViewForms: boolean;
  canEditForms: boolean;
  canViewReports: boolean;
  canEditReports: boolean;
  canViewTeamPerformance: boolean;
  canEditTeamPerformance: boolean;
  
  // Shared Features
  canViewPatients: boolean;
  canEditPatients: boolean;
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
  canViewSignatures: boolean;
  canCaptureSignatures: boolean;
}

export const DENTAL_ROLE_PERMISSIONS: Record<DentalRole, DentalRolePermissions> = {
  practitioner: {
    // Clinical - Full access
    canViewXrays: true,
    canEditXrays: true,
    canViewOdontogram: true,
    canEditOdontogram: true,
    canViewTreatmentPlans: true,
    canEditTreatmentPlans: true,
    canViewPeriodontalChart: true,
    canEditPeriodontalChart: true,
    canLogProcedures: true,
    canViewClinicalNotes: true,
    canEditClinicalNotes: true,
    
    // Administrative - Read-only
    canViewSchedule: true,
    canEditSchedule: false,
    canViewProduction: true,
    canEditProduction: false,
    canViewBilling: true,
    canEditBilling: false,
    canViewInsurance: true,
    canEditInsurance: false,
    canViewForms: true,
    canEditForms: false,
    canViewReports: true,
    canEditReports: false,
    canViewTeamPerformance: true,
    canEditTeamPerformance: false,
    
    // Shared - Full access
    canViewPatients: true,
    canEditPatients: true,
    canViewDocuments: true,
    canUploadDocuments: true,
    canViewSignatures: true,
    canCaptureSignatures: true,
  },
  
  admin_assistant: {
    // Clinical - Read-only
    canViewXrays: true,
    canEditXrays: false,
    canViewOdontogram: true,
    canEditOdontogram: false,
    canViewTreatmentPlans: true,
    canEditTreatmentPlans: false,
    canViewPeriodontalChart: true,
    canEditPeriodontalChart: false,
    canLogProcedures: false,
    canViewClinicalNotes: true,
    canEditClinicalNotes: false,
    
    // Administrative - Full access
    canViewSchedule: true,
    canEditSchedule: true,
    canViewProduction: true,
    canEditProduction: true,
    canViewBilling: true,
    canEditBilling: true,
    canViewInsurance: true,
    canEditInsurance: true,
    canViewForms: true,
    canEditForms: true,
    canViewReports: true,
    canEditReports: true,
    canViewTeamPerformance: true,
    canEditTeamPerformance: true,
    
    // Shared - Full access
    canViewPatients: true,
    canEditPatients: true,
    canViewDocuments: true,
    canUploadDocuments: true,
    canViewSignatures: true,
    canCaptureSignatures: true,
  },
  
  practice_owner: {
    // Clinical - Full access
    canViewXrays: true,
    canEditXrays: true,
    canViewOdontogram: true,
    canEditOdontogram: true,
    canViewTreatmentPlans: true,
    canEditTreatmentPlans: true,
    canViewPeriodontalChart: true,
    canEditPeriodontalChart: true,
    canLogProcedures: true,
    canViewClinicalNotes: true,
    canEditClinicalNotes: true,
    
    // Administrative - Full access
    canViewSchedule: true,
    canEditSchedule: true,
    canViewProduction: true,
    canEditProduction: true,
    canViewBilling: true,
    canEditBilling: true,
    canViewInsurance: true,
    canEditInsurance: true,
    canViewForms: true,
    canEditForms: true,
    canViewReports: true,
    canEditReports: true,
    canViewTeamPerformance: true,
    canEditTeamPerformance: true,
    
    // Shared - Full access
    canViewPatients: true,
    canEditPatients: true,
    canViewDocuments: true,
    canUploadDocuments: true,
    canViewSignatures: true,
    canCaptureSignatures: true,
  },
  
  hybrid: {
    // Clinical - Full access
    canViewXrays: true,
    canEditXrays: true,
    canViewOdontogram: true,
    canEditOdontogram: true,
    canViewTreatmentPlans: true,
    canEditTreatmentPlans: true,
    canViewPeriodontalChart: true,
    canEditPeriodontalChart: true,
    canLogProcedures: true,
    canViewClinicalNotes: true,
    canEditClinicalNotes: true,
    
    // Administrative - Full access
    canViewSchedule: true,
    canEditSchedule: true,
    canViewProduction: true,
    canEditProduction: true,
    canViewBilling: true,
    canEditBilling: true,
    canViewInsurance: true,
    canEditInsurance: true,
    canViewForms: true,
    canEditForms: true,
    canViewReports: true,
    canEditReports: true,
    canViewTeamPerformance: true,
    canEditTeamPerformance: true,
    
    // Shared - Full access
    canViewPatients: true,
    canEditPatients: true,
    canViewDocuments: true,
    canUploadDocuments: true,
    canViewSignatures: true,
    canCaptureSignatures: true,
  },
};

/**
 * Get user's dental role (defaults to practitioner if not set)
 */
export function getUserDentalRole(userRole?: string, userMetadata?: any): DentalRole {
  // Check user metadata for dental role
  if (userMetadata?.dentalRole) {
    return userMetadata.dentalRole as DentalRole;
  }
  
  // Check user role
  if (userRole === 'ADMIN' || userRole === 'AGENCY') {
    return 'practice_owner';
  }
  
  // Default to practitioner
  return 'practitioner';
}

/**
 * Get permissions for a dental role
 */
export function getDentalRolePermissions(role: DentalRole): DentalRolePermissions {
  return DENTAL_ROLE_PERMISSIONS[role] || DENTAL_ROLE_PERMISSIONS.practitioner;
}

/**
 * Check if user can access clinical dashboard
 */
export function canAccessClinicalDashboard(role: DentalRole): boolean {
  return ['practitioner', 'practice_owner', 'hybrid'].includes(role);
}

/**
 * Check if user can access administrative dashboard
 */
export function canAccessAdminDashboard(role: DentalRole): boolean {
  return ['admin_assistant', 'practice_owner', 'hybrid'].includes(role);
}
