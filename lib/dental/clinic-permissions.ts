/**
 * Cross-Clinic Permission Utilities
 * Handles permission checks for multi-clinic operations
 */

import { prisma } from '@/lib/db';

export type ClinicRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface ClinicPermission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
}

/**
 * Get user's role for a specific clinic
 */
export async function getUserClinicRole(
  userId: string,
  clinicId: string
): Promise<ClinicRole | null> {
  const userClinic = await prisma.userClinic.findFirst({
    where: {
      userId,
      clinicId,
    },
  });

  return (userClinic?.role as ClinicRole) || null;
}

/**
 * Check if user has access to a clinic
 */
export async function hasClinicAccess(
  userId: string,
  clinicId: string
): Promise<boolean> {
  const userClinic = await prisma.userClinic.findFirst({
    where: {
      userId,
      clinicId,
    },
  });

  return !!userClinic;
}

/**
 * Get permissions for a user in a clinic based on their role
 */
export function getClinicPermissions(role: ClinicRole | null): ClinicPermission {
  if (!role) {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canManageUsers: false,
      canManageSettings: false,
    };
  }

  switch (role) {
    case 'OWNER':
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageUsers: true,
        canManageSettings: true,
      };
    case 'ADMIN':
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canManageUsers: true,
        canManageSettings: true,
      };
    case 'MEMBER':
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageUsers: false,
        canManageSettings: false,
      };
    default:
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageUsers: false,
        canManageSettings: false,
      };
  }
}

/**
 * Check if user can access data from another clinic (cross-clinic access)
 */
export async function canAccessCrossClinicData(
  userId: string,
  sourceClinicId: string,
  targetClinicId: string
): Promise<boolean> {
  // Same clinic - always allowed
  if (sourceClinicId === targetClinicId) {
    return true;
  }

  // Check if user is OWNER or ADMIN in source clinic
  const sourceRole = await getUserClinicRole(userId, sourceClinicId);
  if (sourceRole === 'OWNER') {
    // Owners can access data from all their clinics
    return hasClinicAccess(userId, targetClinicId);
  }

  // Check if user is OWNER or ADMIN in target clinic
  const targetRole = await getUserClinicRole(userId, targetClinicId);
  if (targetRole === 'OWNER' || targetRole === 'ADMIN') {
    return true;
  }

  // Default: no cross-clinic access
  return false;
}

/**
 * Verify user has required permission for clinic operation
 */
export async function verifyClinicPermission(
  userId: string,
  clinicId: string,
  requiredPermission: keyof ClinicPermission
): Promise<boolean> {
  const role = await getUserClinicRole(userId, clinicId);
  const permissions = getClinicPermissions(role);
  return permissions[requiredPermission];
}

/**
 * Get all clinics user has access to with their roles
 */
export async function getUserClinics(userId: string) {
  return prisma.userClinic.findMany({
    where: { userId },
    include: {
      clinic: true,
    },
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'asc' },
    ],
  });
}

/**
 * Check if user can manage users in a clinic
 */
export async function canManageClinicUsers(
  userId: string,
  clinicId: string
): Promise<boolean> {
  return verifyClinicPermission(userId, clinicId, 'canManageUsers');
}

/**
 * Check if user can edit clinic settings
 */
export async function canEditClinicSettings(
  userId: string,
  clinicId: string
): Promise<boolean> {
  return verifyClinicPermission(userId, clinicId, 'canManageSettings');
}
